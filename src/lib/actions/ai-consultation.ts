'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { analyze } from '@/lib/mdri/engine'
import { loadMDRIData } from '@/lib/mdri/data-loader'
import { HOMEOPATH_SYSTEM_PROMPT } from '@/lib/mdri/homeopath-prompt'
import Anthropic from '@anthropic-ai/sdk'
import type {
  MDRISymptom, MDRIModality, MDRIPatientProfile, MDRIResult,
  AIHomeopathResult, ConsensusResult, MDRISymptomCategory,
} from '@/lib/mdri/types'
import { DEFAULT_PROFILE } from '@/lib/mdri/types'

// --- Валидация ---

const symptomSchema = z.object({
  rubric: z.string().max(500),
  category: z.enum(['mental', 'general', 'particular']),
  present: z.boolean(),
  weight: z.number().int().min(1).max(3),
})

const modalitySchema = z.object({
  pairId: z.string().max(50),
  value: z.enum(['agg', 'amel']),
})

const profileSchema = z.object({
  acuteOrChronic: z.enum(['acute', 'chronic']),
  vitality: z.enum(['high', 'medium', 'low']),
  sensitivity: z.enum(['high', 'medium', 'low']),
  age: z.enum(['child', 'adult', 'elderly']),
})

const analyzeSchema = z.object({
  consultationId: z.string().uuid(),
  symptoms: z.array(symptomSchema).min(1).max(50),
  modalities: z.array(modalitySchema).max(20).default([]),
  familyHistory: z.array(z.string().max(200)).max(20).default([]),
  profile: profileSchema.default(DEFAULT_PROFILE),
})

const analyzeTextSchema = z.object({
  consultationId: z.string().uuid(),
  text: z.string().min(10).max(10000),
  profile: profileSchema.default(DEFAULT_PROFILE),
})

// --- Anthropic клиент ---

function getAnthropicClient() {
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })
}

// --- Основные Actions ---

/**
 * Структурированный анализ — симптомы уже разложены по категориям
 */
export async function analyzeCase(input: z.input<typeof analyzeSchema>): Promise<ConsensusResult> {
  const parsed = analyzeSchema.parse(input)
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Проверить подписку AI Pro или наличие кредитов
  await checkAIAccess(supabase, user.id)

  // Проверить что консультация принадлежит врачу
  const { data: consultation } = await supabase
    .from('consultations')
    .select('id')
    .eq('id', parsed.consultationId)
    .eq('doctor_id', user.id)
    .single()
  if (!consultation) throw new Error('Consultation not found')

  // MDRI-анализ
  const data = await loadMDRIData()
  const mdriResults = analyze(
    data,
    parsed.symptoms as MDRISymptom[],
    parsed.modalities as MDRIModality[],
    parsed.familyHistory,
    parsed.profile as MDRIPatientProfile,
  )

  // Sonnet-анализ параллельно
  const caseText = formatCaseForAI(parsed.symptoms, parsed.modalities, parsed.familyHistory, parsed.profile)
  const aiResult = await callSonnetHomeopath(caseText)

  // Consensus
  const result = await buildConsensus(mdriResults, aiResult, caseText)

  // Сохранить результат в консультацию
  await supabase
    .from('consultations')
    .update({
      ai_result: result as unknown as Record<string, unknown>,
      source: 'ai',
    })
    .eq('id', parsed.consultationId)

  // Списать кредит (если не безлимитная подписка)
  await deductAICredit(supabase, user.id)

  return result
}

/**
 * Анализ свободного текста — Sonnet парсит → MDRI считает
 */
export async function analyzeText(input: z.input<typeof analyzeTextSchema>): Promise<ConsensusResult> {
  const parsed = analyzeTextSchema.parse(input)
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  await checkAIAccess(supabase, user.id)

  const { data: consultation } = await supabase
    .from('consultations')
    .select('id')
    .eq('id', parsed.consultationId)
    .eq('doctor_id', user.id)
    .single()
  if (!consultation) throw new Error('Consultation not found')

  // Sonnet парсит текст в структурированные симптомы
  const { symptoms, modalities, familyHistory } = await parseTextWithSonnet(parsed.text)

  // MDRI-анализ
  const data = await loadMDRIData()
  const mdriResults = analyze(data, symptoms, modalities, familyHistory, parsed.profile as MDRIPatientProfile)

  // Sonnet-гомеопат анализирует тот же текст
  const aiResult = await callSonnetHomeopath(parsed.text)

  // Consensus
  const result = await buildConsensus(mdriResults, aiResult, parsed.text)

  await supabase
    .from('consultations')
    .update({
      ai_result: result as unknown as Record<string, unknown>,
      source: 'ai',
    })
    .eq('id', parsed.consultationId)

  await deductAICredit(supabase, user.id)

  return result
}

// --- Вспомогательные ---

async function checkAIAccess(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
) {
  // Проверить подписку AI Pro (безлимит) или наличие кредитов
  const { data: settings } = await supabase
    .from('doctor_settings')
    .select('subscription_plan, ai_credits')
    .eq('doctor_id', userId)
    .single()

  if (!settings) throw new Error('Settings not found')

  const isAIPro = settings.subscription_plan === 'ai_pro'
  const hasCredits = (settings.ai_credits ?? 0) > 0

  if (!isAIPro && !hasCredits) {
    throw new Error('NO_AI_ACCESS')
  }
}

async function deductAICredit(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
) {
  const { data: settings } = await supabase
    .from('doctor_settings')
    .select('subscription_plan, ai_credits')
    .eq('doctor_id', userId)
    .single()

  // AI Pro — не списываем
  if (settings?.subscription_plan === 'ai_pro') return

  // Списать 1 кредит
  if (settings && (settings.ai_credits ?? 0) > 0) {
    await supabase
      .from('doctor_settings')
      .update({ ai_credits: (settings.ai_credits ?? 1) - 1 })
      .eq('doctor_id', userId)
  }
}

function formatCaseForAI(
  symptoms: z.infer<typeof symptomSchema>[],
  modalities: z.infer<typeof modalitySchema>[],
  familyHistory: string[],
  profile: z.infer<typeof profileSchema>,
): string {
  const lines: string[] = []
  lines.push(`Пациент: ${profile.age === 'child' ? 'ребёнок' : profile.age === 'elderly' ? 'пожилой' : 'взрослый'}, ${profile.acuteOrChronic === 'acute' ? 'острый' : 'хронический'} случай`)
  lines.push(`Витальность: ${profile.vitality}, Чувствительность: ${profile.sensitivity}`)
  lines.push('')

  const mental = symptoms.filter(s => s.category === 'mental' && s.present)
  const general = symptoms.filter(s => s.category === 'general' && s.present)
  const particular = symptoms.filter(s => s.category === 'particular' && s.present)
  const absent = symptoms.filter(s => !s.present)

  if (mental.length) {
    lines.push('МЕНТАЛЬНЫЕ:')
    mental.forEach(s => lines.push(`  - ${s.rubric} (вес ${s.weight})`))
  }
  if (general.length) {
    lines.push('ОБЩИЕ:')
    general.forEach(s => lines.push(`  - ${s.rubric} (вес ${s.weight})`))
  }
  if (particular.length) {
    lines.push('ЧАСТНЫЕ:')
    particular.forEach(s => lines.push(`  - ${s.rubric} (вес ${s.weight})`))
  }
  if (absent.length) {
    lines.push('ОТСУТСТВУЕТ:')
    absent.forEach(s => lines.push(`  - ${s.rubric}`))
  }
  if (modalities.length) {
    lines.push('МОДАЛЬНОСТИ:')
    modalities.forEach(m => lines.push(`  - ${m.pairId}: ${m.value === 'agg' ? 'хуже' : 'лучше'}`))
  }
  if (familyHistory.length) {
    lines.push('СЕМЕЙНЫЙ АНАМНЕЗ:')
    familyHistory.forEach(f => lines.push(`  - ${f}`))
  }

  return lines.join('\n')
}

async function callSonnetHomeopath(caseText: string): Promise<AIHomeopathResult | null> {
  try {
    const client = getAnthropicClient()
    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1500,
      system: HOMEOPATH_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: caseText }],
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : ''
    // Парсим JSON из ответа (Sonnet иногда оборачивает в ```json```)
    const jsonStr = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim()
    const parsed = JSON.parse(jsonStr)

    return {
      remedy: (parsed.remedy ?? '').toLowerCase(),
      confidence: parsed.confidence ?? 0,
      reasoning: parsed.reasoning ?? '',
      miasm: parsed.miasm ?? null,
      potency: parsed.potency ?? '30C',
      differential: parsed.differential ?? '',
    }
  } catch {
    return null
  }
}

async function parseTextWithSonnet(text: string): Promise<{
  symptoms: MDRISymptom[]
  modalities: MDRIModality[]
  familyHistory: string[]
}> {
  const client = getAnthropicClient()
  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2000,
    system: `Ты — парсер гомеопатического случая. Извлеки из текста симптомы, модальности и семейный анамнез.
Верни ТОЛЬКО JSON без обёрток:
{
  "symptoms": [{"rubric": "symptom in English", "category": "mental|general|particular", "present": true, "weight": 1-3}],
  "modalities": [{"pairId": "heat_cold|motion_rest|open_air|sea|morning_evening|company_alone|consolation|pressure|eating|menses", "value": "agg|amel"}],
  "familyHistory": ["disease1", "disease2"]
}
Переводи симптомы на английский в формат реперториума. present=false для отсутствующих симптомов.`,
    messages: [{ role: 'user', content: text }],
  })

  const responseText = response.content[0].type === 'text' ? response.content[0].text : '{}'
  const jsonStr = responseText.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim()

  try {
    const parsed = JSON.parse(jsonStr)
    return {
      symptoms: (parsed.symptoms ?? []).map((s: Record<string, unknown>) => ({
        rubric: String(s.rubric ?? ''),
        category: (['mental', 'general', 'particular'].includes(String(s.category)) ? s.category : 'particular') as MDRISymptomCategory,
        present: s.present !== false,
        weight: Math.min(3, Math.max(1, Number(s.weight) || 2)),
      })),
      modalities: (parsed.modalities ?? []).map((m: Record<string, unknown>) => ({
        pairId: String(m.pairId ?? ''),
        value: m.value === 'amel' ? 'amel' as const : 'agg' as const,
      })),
      familyHistory: (parsed.familyHistory ?? []).map((f: unknown) => String(f)),
    }
  } catch {
    return { symptoms: [], modalities: [], familyHistory: [] }
  }
}

async function buildConsensus(
  mdriResults: MDRIResult[],
  aiResult: AIHomeopathResult | null,
  caseText: string,
): Promise<ConsensusResult> {
  const mdriTop = mdriResults[0]?.remedy ?? ''
  const sonnetRemedy = aiResult?.remedy ?? ''

  // Если совпали — consensus
  if (mdriTop && sonnetRemedy && mdriTop === sonnetRemedy) {
    return {
      method: 'consensus',
      finalRemedy: mdriTop,
      sonnetRemedy,
      mdriRemedy: mdriTop,
      mdriResults,
      aiResult,
      cost: 0.01,
    }
  }

  // Sonnet в top-3 MDRI — доверяем Sonnet
  const mdriTop3 = mdriResults.slice(0, 3).map(r => r.remedy)
  if (sonnetRemedy && mdriTop3.includes(sonnetRemedy)) {
    return {
      method: 'sonnet_priority',
      finalRemedy: sonnetRemedy,
      sonnetRemedy,
      mdriRemedy: mdriTop,
      mdriResults,
      aiResult,
      cost: 0.01,
    }
  }

  // Разногласие — вызываем Opus арбитра
  try {
    const client = getAnthropicClient()
    const arbiterResponse = await client.messages.create({
      model: 'claude-opus-4-20250514',
      max_tokens: 800,
      system: `Ты — арбитр. Два эксперта дали разные препараты для одного пациента.
Выбери правильный, основываясь на симптомах. Верни ТОЛЬКО JSON: {"remedy": "abbrev", "reasoning": "..."}`,
      messages: [{
        role: 'user',
        content: `Случай:\n${caseText}\n\nЭксперт 1 (AI): ${sonnetRemedy} (${aiResult?.reasoning ?? ''})\nЭксперт 2 (MDRI): ${mdriTop} (score: ${mdriResults[0]?.totalScore ?? 0})\n\nМDRI top-5: ${mdriResults.slice(0, 5).map(r => `${r.remedy}(${r.totalScore})`).join(', ')}`,
      }],
    })

    const arbiterText = arbiterResponse.content[0].type === 'text' ? arbiterResponse.content[0].text : '{}'
    const arbiterJson = JSON.parse(arbiterText.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim())
    const finalRemedy = (arbiterJson.remedy ?? mdriTop).toLowerCase()

    return {
      method: 'opus_arbiter',
      finalRemedy,
      sonnetRemedy,
      mdriRemedy: mdriTop,
      mdriResults,
      aiResult,
      cost: 0.06, // Sonnet + Opus
    }
  } catch {
    // Fallback на MDRI при ошибке Opus
    return {
      method: 'sonnet_priority',
      finalRemedy: sonnetRemedy || mdriTop,
      sonnetRemedy,
      mdriRemedy: mdriTop,
      mdriResults,
      aiResult,
      cost: 0.01,
    }
  }
}

// --- Генерация вопросов AI ---

export type AIQuestion = {
  key: string
  label: string
  type: 'textarea' | 'text' | 'chips' | 'chips-multi'
  options?: string[]
  hint?: string
}

/**
 * AI генерирует вопросы на основе свободного текста и истории пациента
 */
export async function generateQuestions(
  text: string,
  patientHistory?: string,
): Promise<AIQuestion[]> {
  const client = getAnthropicClient()

  const contextParts = []
  if (patientHistory) contextParts.push(`ИСТОРИЯ ПАЦИЕНТА:\n${patientHistory}`)
  if (text.trim()) contextParts.push(`ОПИСАНИЕ ВРАЧА:\n${text}`)
  const context = contextParts.join('\n\n')

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      system: `Ты — опытный гомеопат. На основе описания случая сгенерируй 5-8 целенаправленных вопросов для уточнения анамнеза.

ПРАВИЛА:
1. Вопросы простым русским языком — как разговор с пациентом
2. Формат chips-multi — когда можно выбрать НЕСКОЛЬКО вариантов (модальности, страхи, эмоции). ИСПОЛЬЗУЙ chips-multi ПО УМОЛЧАНИЮ.
3. Формат chips — ТОЛЬКО когда нужен ОДИН ответ (да/нет, одна температурная характеристика)
4. Формат textarea — для развёрнутых описаний
5. НЕ спрашивай то, что уже известно из описания/истории
6. Приоритет: модальности > психика > generals > particulars
7. Если описание расплывчатое ("мне плохо") — первый вопрос должен уточнить что именно
8. Если есть противоречия — выдели и спроси напрямую
9. Опции (3-8 вариантов) — покрывай основные гомеопатические дифференциалы

ОБРАБОТКА НЕТОЧНОСТЕЙ:
- Расплывчатое "болит голова" → спроси про характер боли (chips-multi: давящая, пульсирующая, колющая, распирающая, тупая...)
- Неполное (нет модальностей) → спроси что ухудшает/улучшает (chips-multi с основными модальностями)
- Противоречие (мёрзну + хуже от тепла) → спроси: "Вы упомянули что мёрзнете, но тепло ухудшает. Уточните: (chips)"

Верни ТОЛЬКО JSON массив (без обёрток):
[{"key": "snake_case_key", "label": "Вопрос?", "type": "chips-multi|chips|textarea|text", "options": ["вариант1", "вариант2"], "hint": "Почему важно"}]`,
      messages: [{ role: 'user', content: context || 'Новый пациент, данных нет. Задай базовые вопросы для гомеопатического анализа.' }],
    })

    const responseText = response.content[0].type === 'text' ? response.content[0].text : '[]'
    const jsonStr = responseText.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim()
    const questions = JSON.parse(jsonStr) as AIQuestion[]

    if (!Array.isArray(questions) || questions.length === 0) return getFallbackQuestions()
    // Принудительно: chips с 3+ опциями → chips-multi (Sonnet иногда игнорирует инструкцию)
    return questions.map(q => ({
      ...q,
      type: q.type === 'chips' && q.options && q.options.length > 2 ? 'chips-multi' as const : q.type,
    }))
  } catch {
    return getFallbackQuestions()
  }
}

/**
 * AI генерирует уточняющие вопросы при low confidence
 */
export async function generateClarifyingQuestions(
  currentSymptoms: string[],
  topRemedies: { remedy: string; score: number; confidence: string }[],
): Promise<AIQuestion[]> {
  const client = getAnthropicClient()

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1500,
      system: `Ты — гомеопат. Анализ дал низкую уверенность. Сгенерируй 3-5 уточняющих вопросов чтобы:
1. Различить top-2 препарата (какой вопрос их разделит?)
2. Покрыть недостающие категории (модальности? психика? общие?)
3. Уточнить расплывчатые симптомы

Формат: chips-multi (можно выбрать несколько, 3-6 вариантов) или textarea. Вопросы на русском, простым языком.
Верни ТОЛЬКО JSON массив: [{"key": "...", "label": "...", "type": "chips-multi|chips|textarea", "options": [...], "hint": "..."}]`,
      messages: [{
        role: 'user',
        content: `Текущие симптомы: ${currentSymptoms.join(', ')}\n\nTop-3 препарата:\n${topRemedies.map(r => `${r.remedy} (${r.score}%, ${r.confidence})`).join('\n')}`,
      }],
    })

    const responseText = response.content[0].type === 'text' ? response.content[0].text : '[]'
    const jsonStr = responseText.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim()
    const questions = JSON.parse(jsonStr) as AIQuestion[]

    if (!Array.isArray(questions) || questions.length === 0) return getFallbackClarifying()
    return questions.map(q => ({
      ...q,
      type: q.type === 'chips' && q.options && q.options.length > 2 ? 'chips-multi' as const : q.type,
    }))
  } catch {
    return getFallbackClarifying()
  }
}

/**
 * Сводка истории пациента для показа врачу
 */
export async function summarizePatientHistory(
  consultations: { date: string; complaints: string; remedy: string | null; potency: string | null; reaction_to_previous: string | null; notes: string }[],
  intakeAnswers: Record<string, string> | null,
): Promise<string> {
  if (consultations.length === 0 && !intakeAnswers) return ''

  const parts: string[] = []

  // Последнее назначение
  const lastRx = consultations.find(c => c.remedy)
  if (lastRx) {
    parts.push(`Последнее назначение: ${lastRx.remedy} ${lastRx.potency ?? ''} (${lastRx.date})`)
    if (lastRx.reaction_to_previous) parts.push(`Реакция: ${lastRx.reaction_to_previous}`)
  }

  // Ключевые жалобы
  const complaints = consultations
    .filter(c => c.complaints?.trim())
    .slice(0, 3)
    .map(c => c.complaints.slice(0, 200))
  if (complaints.length) parts.push(`Жалобы: ${complaints.join('; ')}`)

  // Из анкеты
  if (intakeAnswers) {
    const important = ['chief_complaint', 'thermal', 'consolation', 'fears', 'sleep', 'food_desires']
    for (const key of important) {
      if (intakeAnswers[key]?.trim()) {
        parts.push(`${key}: ${intakeAnswers[key].slice(0, 200)}`)
      }
    }
  }

  return parts.join('\n')
}

// Fallback вопросы если Sonnet недоступен
function getFallbackQuestions(): AIQuestion[] {
  return [
    { key: 'chief_complaint', label: 'Что беспокоит пациента больше всего?', type: 'textarea', hint: 'Опишите главную жалобу' },
    { key: 'modalities', label: 'Что ухудшает состояние?', type: 'chips-multi', options: ['Холод', 'Тепло', 'Движение', 'Покой', 'Ночью', 'Утром', 'После еды', 'На свежем воздухе'] },
    { key: 'modalities_better', label: 'Что улучшает?', type: 'chips-multi', options: ['Тепло', 'Холод', 'Движение', 'Покой', 'Свежий воздух', 'Давление', 'Еда', 'Сон'] },
    { key: 'thermal', label: 'Как пациент переносит температуру?', type: 'chips', options: ['Зябкий, мёрзнет', 'Нормально', 'Жаркий, любит прохладу'] },
    { key: 'emotional', label: 'Эмоциональное состояние', type: 'chips-multi', options: ['Тревожный', 'Раздражительный', 'Подавленный', 'Плаксивый', 'Безразличный', 'Беспокойный'] },
    { key: 'thirst', label: 'Жажда', type: 'chips', options: ['Сильная', 'Умеренная', 'Слабая', 'Маленькими глотками'] },
    { key: 'additional', label: 'Что ещё важно знать?', type: 'textarea' },
  ]
}

function getFallbackClarifying(): AIQuestion[] {
  return [
    { key: 'clarify_modality', label: 'Что конкретно ухудшает основную жалобу?', type: 'chips-multi', options: ['Холод', 'Тепло', 'Движение', 'Покой', 'Ночью', 'После еды', 'Стресс'], hint: 'Выберите все подходящие' },
    { key: 'clarify_mental', label: 'Как пациент ведёт себя когда ему плохо?', type: 'chips-multi', options: ['Хочет быть один', 'Ищет компанию', 'Беспокойный', 'Лежит неподвижно', 'Раздражается'] },
    { key: 'clarify_sleep', label: 'Как пациент спит?', type: 'chips-multi', options: ['Хорошо', 'Трудно засыпает', 'Просыпается ночью', 'Кошмары', 'Спит на животе'] },
  ]
}
