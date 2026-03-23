'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { analyzePipeline as analyze } from '@/lib/mdri/engine'
import { loadMDRIData } from '@/lib/mdri/data-loader'
import { HOMEOPATH_SYSTEM_PROMPT } from '@/lib/mdri/homeopath-prompt'
import { PARSING_SYSTEM_PROMPT } from '@/lib/mdri/parsing-prompt'
import Anthropic from '@anthropic-ai/sdk'
import type {
  MDRISymptom, MDRIModality, MDRIPatientProfile, MDRIResult,
  AIHomeopathResult, ConsensusResult, MDRISymptomCategory,
  ParsedSuggestion, ParseSuggestionsResult,
} from '@/lib/mdri/types'
import { DEFAULT_PROFILE } from '@/lib/mdri/types'
import { mergeWithFallback, computeConfidence, validateInput } from '@/lib/mdri/product-layer'

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
  consultationId: z.string().uuid().optional(),
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
  if (!user) throw new Error('Не авторизован')

  await checkAIAccess(supabase, user.id)

  // Детальное логирование с таймингами
  const t0 = Date.now()
  const log = (step: string) => console.log(`[analyzeText] ${step}: ${Date.now() - t0}ms`)

  try {
    log('START')

    // Шаг 1+2 ПАРАЛЛЕЛЬНО: Sonnet парсит + MDRI данные загружаются одновременно
    const [parseResult, data] = await Promise.all([
      parseTextWithSonnet(parsed.text),
      loadMDRIData(),
    ])
    const { symptoms: sonnetSymptoms, modalities: sonnetModalities, familyHistory } = parseResult
    log(`parallel done: ${sonnetSymptoms.length} symptoms, ${data.repertory.length} rubrics`)

    // Шаг 2.5: Product Safety Layer — keyword fallback + soft validation
    const { symptoms, modalities, warnings } = mergeWithFallback(
      parsed.text,
      sonnetSymptoms,
      sonnetModalities,
    )
    const fallbackAdded = {
      symptoms: symptoms.length - sonnetSymptoms.length,
      modalities: modalities.length - sonnetModalities.length,
      conflicts: warnings.filter(w => w.type === 'uncertain_parse').length,
    }
    if (fallbackAdded.symptoms > 0 || fallbackAdded.modalities > 0) {
      log(`fallback added: +${fallbackAdded.symptoms} symptoms, +${fallbackAdded.modalities} modalities`)
    }

    if (symptoms.length === 0) {
      throw new Error('AI не смог извлечь симптомы из текста. Попробуйте описать подробнее.')
    }

    // Шаг 3: MDRI Engine v5 (НЕ МЕНЯТЬ — заблокирован)
    const mdriResults = analyze(data, symptoms, modalities, familyHistory, parsed.profile as MDRIPatientProfile)
    log(`MDRI v5 done (top: ${mdriResults[0]?.remedy} ${mdriResults[0]?.totalScore}%)`)

    // Шаг 4: Confidence Layer — независимая оценка уверенности
    const productConfidence = computeConfidence(symptoms, modalities, mdriResults, warnings)
    log(`confidence: ${productConfidence.level}`)

    // Результат
    const topRemedy = mdriResults[0]?.remedy ?? ''
    const result: ConsensusResult = {
      method: 'consensus',
      finalRemedy: topRemedy,
      sonnetRemedy: topRemedy,
      mdriRemedy: topRemedy,
      mdriResults,
      aiResult: null,
      cost: 0.01,
      // Product safety layer
      productConfidence,
      warnings,
      fallbackAdded,
    }
    log(`result: ${topRemedy}`)

    // Сохранить если есть consultationId
    if (parsed.consultationId) {
      await supabase
        .from('consultations')
        .update({
          ai_result: result as unknown as Record<string, unknown>,
          source: 'ai',
        })
        .eq('id', parsed.consultationId)
    }

    await deductAICredit(supabase, user.id)
    log('DONE')

    return result
  } catch (e) {
    const elapsed = Date.now() - t0
    console.error(`[analyzeText] FAILED at ${elapsed}ms:`, e instanceof Error ? e.message : e)
    throw e
  }
}

// --- Вспомогательные ---

async function checkAIAccess(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
) {
  const { data: settings } = await supabase
    .from('doctor_settings')
    .select('subscription_plan, ai_credits')
    .eq('doctor_id', userId)
    .single()

  if (!settings) throw new Error('NO_AI_ACCESS')

  const isAIPro = settings.subscription_plan === 'ai_pro'
  const hasCredits = (settings.ai_credits ?? 0) > 0
  // if (!isAIPro && !hasCredits) {
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
    temperature: 0.2, // Низкая вариативность но не нулевая
    system: PARSING_SYSTEM_PROMPT,
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

// === HYBRID PARSING: parse → suggest → confirm → analyze ===

// Словарь перевода rubric → русский (для UI)
const RUBRIC_RU: Record<string, string> = {
  'chilly': 'Зябкий', 'hot patient': 'Жаркий',
  'thirstless': 'Нет жажды', 'thirst large quantities': 'Сильная жажда', 'thirst small sips frequently': 'Пьёт мелкими глотками',
  'consolation aggravates': 'Утешение хуже', 'consolation ameliorates': 'Утешение лучше',
  'weeping easily': 'Плаксивость', 'weeping alone': 'Плачет одна',
  'irritability': 'Раздражительность', 'anxiety': 'Тревога',
  'fear death': 'Страх смерти', 'fear dark': 'Страх темноты', 'fear alone': 'Страх одиночества',
  'jealousy suspicious': 'Ревность', 'indifference': 'Безразличие',
  'grief': 'Горе', 'grief suppressed': 'Подавленное горе',
  'desire salt': 'Любит солёное', 'desire sweets': 'Любит сладкое',
  'worse night': 'Хуже ночью', 'worse morning': 'Хуже утром',
  'worse after sleep': 'Хуже после сна', 'worse sun': 'Хуже на солнце',
  'better at sea seashore': 'Лучше на море',
  'perspiration head night': 'Потеет голова ночью',
  'restlessness': 'Беспокойство', 'fastidious orderly': 'Педантичность',
  'loquacity talkative': 'Болтливость',
  'indifference family': 'Безразличие к семье',
  'emaciation': 'Худеет', 'insomnia': 'Бессонница',
}

function rubricToRussian(rubric: string): string {
  const r = rubric.toLowerCase()
  // Точное совпадение
  for (const [key, val] of Object.entries(RUBRIC_RU)) {
    if (r.includes(key)) return val
  }
  // Fallback: capitalize first word
  return rubric.split(' ').slice(0, 3).join(' ')
}

const MODALITY_RU: Record<string, string> = {
  'heat_cold_agg': 'Тепло хуже', 'heat_cold_amel': 'Тепло лучше (зябкий)',
  'motion_rest_agg': 'Движение хуже', 'motion_rest_amel': 'Движение лучше',
  'open_air_agg': 'Свежий воздух хуже', 'open_air_amel': 'Свежий воздух лучше',
  'consolation_agg': 'Утешение хуже', 'consolation_amel': 'Утешение лучше',
  'company_alone_agg': 'Компания хуже', 'company_alone_amel': 'Компания лучше',
  'pressure_agg': 'Давление хуже', 'pressure_amel': 'Давление лучше',
  'sea_amel': 'Море лучше',
}

/**
 * Шаг 1: Парсинг текста → suggestions для подтверждения
 */
export async function parseAndSuggest(input: { text: string }): Promise<ParseSuggestionsResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Не авторизован')

  const parseResult = await parseTextWithSonnet(input.text)
  const { symptoms, modalities, warnings, conflicts } = mergeWithFallback(
    input.text, parseResult.symptoms, parseResult.modalities,
  )

  const hasConflicts = conflicts.length > 0

  // Базовый приоритет до ограничений
  function basePriority(type: string, weight: number, source: string): 'high' | 'medium' | 'low' {
    // keyword-only с низким весом → не доверяем
    if (source === 'keyword' && weight <= 1) return 'low'
    // weight=3 или mental с weight≥2 → high
    if (weight >= 3) return 'high'
    if (type === 'mental' && weight >= 2) return 'high'
    // modality → medium (не high по умолчанию, только weight=3 модальности → high)
    if (type === 'modality') return 'medium'
    // weight=2 или general → medium
    if (weight >= 2) return 'medium'
    if (type === 'general') return 'medium'
    return 'low'
  }

  // Конвертируем в suggestions
  let idCounter = 0
  const suggestions: ParsedSuggestion[] = []

  for (const sym of symptoms) {
    const isFromFallback = !parseResult.symptoms.some(s =>
      s.rubric.toLowerCase().includes(sym.rubric.split(' ')[0].toLowerCase())
    )
    const type = sym.category === 'mental' ? 'mental' : sym.category === 'general' ? 'general' : 'particular'
    const weight = sym.weight as 1 | 2 | 3
    const source = isFromFallback ? 'keyword' as const : 'sonnet' as const
    const priority = basePriority(type, weight, source)
    suggestions.push({
      id: `s-${idCounter++}`,
      rubric: sym.rubric,
      label: rubricToRussian(sym.rubric),
      type,
      weight,
      priority,
      confirmed: false, // Проставим после ограничений
      source,
    })
  }

  // Модальности → medium по умолчанию (high только при weight=3)
  for (const mod of modalities) {
    const key = `${mod.pairId}_${mod.value}`
    const modSource = parseResult.modalities.some(m => m.pairId === mod.pairId) ? 'sonnet' as const : 'keyword' as const
    suggestions.push({
      id: `m-${idCounter++}`,
      rubric: `${mod.pairId}:${mod.value}`,
      label: MODALITY_RU[key] ?? `${mod.pairId} ${mod.value === 'agg' ? 'хуже' : 'лучше'}`,
      type: 'modality',
      weight: 2,
      priority: modSource === 'sonnet' ? 'medium' : 'low',
      confirmed: false,
      source: modSource,
    })
  }

  // === Post-processing: ограничения, баланс, safety ===

  const MAX_HIGH = 5
  const MAX_MEDIUM = 7
  const MAX_MENTAL_HIGH = 3  // Макс mental симптомов в high

  // 0. Weak symptom filter: слишком общие → max medium
  // Однословные рубрики и очень короткие — слишком расплывчатые для high
  for (const s of suggestions) {
    if (s.priority === 'high') {
      const words = s.rubric.split(/[\s,]+/).filter(w => w.length > 2)
      if (words.length <= 1) s.priority = 'medium' // "headache", "fever" — слишком общие
    }
  }

  // 1. Баланс категорий в high: max 3 mental
  let mentalHighCount = 0
  for (const s of suggestions) {
    if (s.priority === 'high' && s.type === 'mental') {
      mentalHighCount++
      if (mentalHighCount > MAX_MENTAL_HIGH) {
        s.priority = 'medium'
      }
    }
  }

  // 2. Cap high → medium
  let highCount = 0
  for (const s of suggestions) {
    if (s.priority === 'high') {
      highCount++
      if (highCount > MAX_HIGH) s.priority = 'medium'
    }
  }

  // 3. Cap medium → low
  let mediumCount = 0
  for (const s of suggestions) {
    if (s.priority === 'medium') {
      mediumCount++
      if (mediumCount > MAX_MEDIUM) s.priority = 'low'
    }
  }

  // 4. Conflict safety: downgrade high → medium (не обнуляем confirmed)
  if (hasConflicts) {
    for (const s of suggestions) {
      if (s.priority === 'high') s.priority = 'medium'
    }
  }

  // 5. Auto-confirm: только high
  for (const s of suggestions) {
    if (s.priority === 'high') s.confirmed = true
  }

  // 6. Minimal required set — warnings если не хватает категорий
  const hasGeneral = suggestions.some(s => s.type === 'general')
  const hasParticular = suggestions.some(s => s.type === 'particular')
  const hasModality = suggestions.some(s => s.type === 'modality')

  if (!hasGeneral) {
    warnings.push({ type: 'no_general', message: 'Нет общих симптомов', hint: 'Добавьте температурные предпочтения, жажду, аппетит' })
  }
  if (!hasParticular) {
    warnings.push({ type: 'only_particulars', message: 'Нет частных симптомов', hint: 'Опишите локализацию и характер жалоб' })
  }
  if (!hasModality) {
    warnings.push({ type: 'no_modalities', message: 'Нет модальностей', hint: 'Укажите что ухудшает/улучшает состояние' })
  }

  return {
    suggestions,
    modalities,
    familyHistory: parseResult.familyHistory,
    warnings,
    rawSymptomCount: parseResult.symptoms.length,
    fallbackCount: symptoms.length - parseResult.symptoms.length,
  }
}

/**
 * Шаг 2: Анализ с подтверждёнными suggestions
 */
export async function analyzeConfirmed(input: {
  consultationId?: string
  suggestions: ParsedSuggestion[]
  familyHistory: string[]
  profile?: MDRIPatientProfile
}): Promise<ConsensusResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Не авторизован')
  await checkAIAccess(supabase, user.id)

  const confirmed = input.suggestions.filter(s => s.confirmed)

  // Priority → weight множитель: high=1.0, medium=0.5, low=0.2
  const PRIORITY_WEIGHT: Record<string, number> = { high: 1.0, medium: 0.5, low: 0.2 }

  // Собираем symptoms из confirmed (исключая modalities)
  const symptoms: MDRISymptom[] = confirmed
    .filter(s => s.type !== 'modality')
    .map(s => {
      const priorityMult = PRIORITY_WEIGHT[s.priority] ?? 0.5
      // Применяем приоритет к весу: округляем до 1-3
      const adjustedWeight = Math.max(1, Math.min(3, Math.round(s.weight * priorityMult))) as 1 | 2 | 3
      return {
        rubric: s.rubric,
        category: (s.type === 'mental' ? 'mental' : s.type === 'general' ? 'general' : 'particular') as MDRISymptomCategory,
        present: true,
        weight: adjustedWeight,
      }
    })

  // Собираем modalities из confirmed
  const modalities: MDRIModality[] = confirmed
    .filter(s => s.type === 'modality')
    .map(s => {
      const [pairId, value] = s.rubric.split(':')
      return { pairId, value: value as 'agg' | 'amel' }
    })

  if (symptoms.length === 0) {
    throw new Error('Нет подтверждённых симптомов')
  }

  const profile = input.profile ?? DEFAULT_PROFILE
  const data = await loadMDRIData()
  const mdriResults = analyze(data, symptoms, modalities, input.familyHistory, profile)

  const productConfidence = computeConfidence(symptoms, modalities, mdriResults,
    validateInput(symptoms, modalities))

  const topRemedy = mdriResults[0]?.remedy ?? ''
  const result: ConsensusResult = {
    method: 'consensus',
    finalRemedy: topRemedy,
    sonnetRemedy: topRemedy,
    mdriRemedy: topRemedy,
    mdriResults,
    aiResult: null,
    cost: 0.01,
    productConfidence,
    warnings: validateInput(symptoms, modalities),
  }

  if (input.consultationId) {
    await supabase
      .from('consultations')
      .update({ ai_result: result as unknown as Record<string, unknown>, source: 'ai' })
      .eq('id', input.consultationId)
  }

  // Логирование: confirmed input + engine top-3 + confidence
  const inputWarnings = validateInput(symptoms, modalities)
  try {
    await supabase.from('ai_analysis_log').insert({
      user_id: user.id,
      consultation_id: input.consultationId ?? null,
      confirmed_input: confirmed.map(s => ({ rubric: s.rubric, type: s.type, priority: s.priority, weight: s.weight })),
      engine_top3: mdriResults.slice(0, 3).map(r => ({ remedy: r.remedy, score: r.totalScore })),
      confidence_level: productConfidence?.level ?? null,
      warnings: inputWarnings.length > 0 ? inputWarnings : null,
      symptom_count: symptoms.length,
      modality_count: modalities.length,
      has_conflict: inputWarnings.some(w => w.type === 'uncertain_parse'),
    })
  } catch { /* логирование не должно ломать анализ */ }

  await deductAICredit(supabase, user.id)
  return result
}

/**
 * Логирование выбора врача (silent feedback)
 * Вызывается при назначении препарата после AI-анализа
 */
export async function logDoctorChoice(consultationId: string, chosenRemedy: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  try {
    await supabase.from('ai_analysis_log')
      .update({ doctor_choice: chosenRemedy })
      .eq('consultation_id', consultationId)
      .eq('user_id', user.id)
  } catch { /* silent */ }
}

function getFallbackClarifying(): AIQuestion[] {
  return [
    { key: 'clarify_modality', label: 'Что конкретно ухудшает основную жалобу?', type: 'chips-multi', options: ['Холод', 'Тепло', 'Движение', 'Покой', 'Ночью', 'После еды', 'Стресс'], hint: 'Выберите все подходящие' },
    { key: 'clarify_mental', label: 'Как пациент ведёт себя когда ему плохо?', type: 'chips-multi', options: ['Хочет быть один', 'Ищет компанию', 'Беспокойный', 'Лежит неподвижно', 'Раздражается'] },
    { key: 'clarify_sleep', label: 'Как пациент спит?', type: 'chips-multi', options: ['Хорошо', 'Трудно засыпает', 'Просыпается ночью', 'Кошмары', 'Спит на животе'] },
  ]
}
