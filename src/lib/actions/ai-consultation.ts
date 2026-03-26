'use server'

import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/server-utils'
import { z } from 'zod'
import { analyzePipeline as analyzeRaw } from '@/lib/mdri/engine'
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
import { mergeWithFallback, computeConfidence, validateInput, analyzeWithIdf } from '@/lib/mdri/product-layer'
import { inferPatientProfile, toEngineProfile } from '@/lib/mdri/infer-profile'
import { VERIFIER_SYSTEM_PROMPT } from '@/lib/mdri/verifier-prompt'

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
  profile: profileSchema.optional(), // Убран из UI, теперь определяется автоматически
})

// --- Anthropic клиент ---

function getAnthropicClient() {
  // Таймаут 30с — защита от зависших запросов к API
  // ANTHROPIC_BASE_URL — proxy через Hetzner (Timeweb IP заблокирован Anthropic)
  return new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY!,
    baseURL: process.env.ANTHROPIC_BASE_URL || 'https://api.anthropic.com',
    timeout: 30_000,
  })
}

// --- Основные Actions ---

/**
 * Структурированный анализ — симптомы уже разложены по категориям
 */
export async function analyzeCase(input: z.input<typeof analyzeSchema>): Promise<ConsensusResult> {
  const parsed = analyzeSchema.parse(input)
  const { userId } = await requireAuth()

  // Проверить подписку AI Pro или наличие кредитов
  await checkAIAccess(userId)

  // Проверить что консультация принадлежит врачу
  const consultation = await prisma.consultation.findFirst({
    where: { id: parsed.consultationId, doctorId: userId },
    select: { id: true },
  })
  if (!consultation) throw new Error('Consultation not found')

  // MDRI-анализ
  const data = await loadMDRIData()
  const mdriResults = analyzeWithIdf(
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

  // Сохранить результат в консультацию (с проверкой владельца)
  await prisma.consultation.updateMany({
    where: { id: parsed.consultationId, doctorId: userId },
    data: {
      aiResult: result as unknown as Record<string, unknown>,
      source: 'ai',
    },
  })

  // Списать кредит (если не безлимитная подписка)
  await deductAICredit(userId)

  return result
}

/**
 * Анализ свободного текста — Sonnet парсит -> MDRI считает
 */
/**
 * Шаг 1: Парсинг текста — без engine, только Sonnet + проверка достаточности.
 * Возвращает parsed данные + список недостающей информации.
 */
export async function parseOnly(input: { text: string }): Promise<{
  _error?: string
  hasMental: boolean
  hasGeneral: boolean
  hasModalities: boolean
  symptomCount: number
  missing: string[]  // какой информации не хватает
}> {
  const text = input.text?.trim()
  if (!text || text.length < 10) return { _error: 'TOO_SHORT', hasMental: false, hasGeneral: false, hasModalities: false, symptomCount: 0, missing: [] }

  const { userId } = await requireAuth()
  try { await checkAIAccess(userId) } catch { return { _error: 'NO_AI_ACCESS', hasMental: false, hasGeneral: false, hasModalities: false, symptomCount: 0, missing: [] } }

  const parseResult = await parseTextWithSonnet(text)
  const merged = mergeWithFallback(text, parseResult.symptoms, parseResult.modalities, parseResult.familyHistory)

  const hasMental = merged.symptoms.some(s => s.category === 'mental')
  const hasGeneral = merged.symptoms.some(s => s.category === 'general')
  const hasModalities = merged.modalities.length > 0
  const symptomCount = merged.symptoms.length

  const missing: string[] = []
  if (!hasModalities) missing.push('modalities')
  if (!hasGeneral) missing.push('general')
  if (!hasMental) missing.push('mental')
  if (symptomCount < 5) missing.push('few_symptoms')

  return { hasMental, hasGeneral, hasModalities, symptomCount, missing }
}

export async function analyzeText(input: z.input<typeof analyzeTextSchema>): Promise<ConsensusResult & { _error?: string }> {
  const parsed = analyzeTextSchema.parse(input)
  const { userId } = await requireAuth()

  try {
    await checkAIAccess(userId)
  } catch {
    // Возвращаем объект с маркером ошибки (не бросаем — Next.js теряет message)
    return { _error: 'NO_AI_ACCESS' } as ConsensusResult & { _error: string }
  }

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

    // Шаг 2.5: Product Safety Layer — keyword fallback + soft validation + familyHistory
    const merged = mergeWithFallback(
      parsed.text,
      sonnetSymptoms,
      sonnetModalities,
      familyHistory,
    )
    const { symptoms, modalities, warnings } = merged
    const mergedFamilyHistory = merged.familyHistory
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

    // Шаг 2.7: Автоматическое определение профиля пациента
    const inferredProfile = inferPatientProfile(parsed.text, symptoms)
    const profile = parsed.profile ?? toEngineProfile(inferredProfile)
    log(`profile inferred: ${profile.acuteOrChronic}/${profile.vitality}/${profile.sensitivity}/${profile.age}`)

    // Шаг 3: MDRI Engine v5 (НЕ МЕНЯТЬ — заблокирован)
    const mdriResults = analyzeWithIdf(data, symptoms, modalities, mergedFamilyHistory, profile)
    log(`MDRI v5 done (top: ${mdriResults[0]?.remedy} ${mdriResults[0]?.totalScore}%)`)

    // Шаг 3.5: Верификатор — confirmation по Materia Medica
    try {
      const reranked = await verifyTop5(parsed.text, mdriResults.slice(0, 5))
      if (reranked) {
        const rest = mdriResults.slice(5)
        mdriResults.length = 0
        mdriResults.push(...reranked, ...rest)
        log(`verifier done (top: ${mdriResults[0]?.remedy} ${mdriResults[0]?.totalScore}%)`)
      }
    } catch (e) {
      log(`verifier skipped: ${e instanceof Error ? e.message : 'unknown error'}`)
    }

    // Шаг 4: Confidence Layer — независимая оценка уверенности
    const productConfidence = computeConfidence(symptoms, modalities, mdriResults, warnings)
    log(`confidence: ${productConfidence.level}`)

    // Использованные симптомы для UI
    const usedSymptoms = symptoms.map(s => ({
      label: rubricToRussian(s.rubric),
      type: (s.category === 'mental' ? 'mental' : s.category === 'general' ? 'general' : 'particular') as 'mental' | 'general' | 'modality' | 'particular',
    }))

    // Перевод matchedRubrics на русский
    for (const r of mdriResults) {
      if (r.matchedRubrics) {
        r.matchedRubrics = r.matchedRubrics.map(rubricToRussian)
      }
    }

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
      usedSymptoms,
      inferredProfile,
      // Structured data для clarify engine
      _parsedSymptoms: symptoms,
      _parsedModalities: modalities,
      // QuestionGain: лучший уточняющий вопрос (вычислен на сервере)
      _clarifyQuestion: (() => {
        try {
          const { selectBestClarifyQuestion } = require('@/lib/mdri/question-gain')
          return selectBestClarifyQuestion(mdriResults, data.constellations, symptoms)
        } catch { return null }
      })(),
    }
    log(`result: ${topRemedy}`)

    // Сохранить если есть consultationId (с проверкой владельца)
    if (parsed.consultationId) {
      await prisma.consultation.updateMany({
        where: { id: parsed.consultationId, doctorId: userId },
        data: {
          aiResult: result as unknown as Record<string, unknown>,
          source: 'ai',
        },
      })
    }

    await deductAICredit(userId)

    // Логирование: analyzeText flow (как в analyzeConfirmed)
    const inputWarnings = validateInput(symptoms, modalities)
    try {
      await prisma.aiAnalysisLog.create({
        data: {
          userId,
          consultationId: parsed.consultationId ?? null,
          inputText: parsed.text.substring(0, 2000), // исходный русский текст (макс 2000 символов)
          confirmedInput: symptoms.map(s => ({ rubric: s.rubric, type: s.category, weight: s.weight })),
          engineTop3: mdriResults.slice(0, 3).map(r => ({ remedy: r.remedy, score: r.totalScore })),
          confidenceLevel: productConfidence?.level ?? null,
          warnings: inputWarnings.length > 0 ? inputWarnings : null,
          symptomCount: symptoms.length,
          modalityCount: modalities.length,
          hasConflict: inputWarnings.some(w => w.type === 'uncertain_parse'),
        },
      })
    } catch { /* логирование не должно ломать анализ */ }

    log('DONE')

    return result
  } catch (e) {
    const elapsed = Date.now() - t0
    console.error(`[analyzeText] FAILED at ${elapsed}ms:`, e instanceof Error ? e.message : e)
    throw e
  }
}

// --- Вспомогательные ---

// Получить AI-статус врача (для UI)
export async function getAIStatus(): Promise<{ isAIPro: boolean; credits: number }> {
  const { userId } = await requireAuth()

  const settings = await prisma.doctorSettings.findUnique({
    where: { doctorId: userId },
    select: { subscriptionPlan: true, aiCredits: true },
  })

  return {
    isAIPro: settings?.subscriptionPlan === 'ai_pro',
    credits: settings?.aiCredits ?? 0,
  }
}

async function checkAIAccess(userId: string) {
  const settings = await prisma.doctorSettings.findUnique({
    where: { doctorId: userId },
    select: { subscriptionPlan: true, aiCredits: true },
  })

  if (!settings) {
    console.error(`[checkAIAccess] NO settings for userId=${userId}`)
    throw new Error('NO_AI_ACCESS')
  }

  const isAIPro = settings.subscriptionPlan === 'ai_pro'
  const hasCredits = (settings.aiCredits ?? 0) > 0
  console.log(`[checkAIAccess] userId=${userId} plan=${settings.subscriptionPlan} credits=${settings.aiCredits} isAIPro=${isAIPro}`)
  if (!isAIPro && !hasCredits) {
    throw new Error('NO_AI_ACCESS')
  }
}

async function deductAICredit(userId: string) {
  // Атомарное списание: уменьшаем кредит на 1 (если не AI Pro)
  const settings = await prisma.doctorSettings.findUnique({
    where: { doctorId: userId },
    select: { subscriptionPlan: true, aiCredits: true },
  })

  // AI Pro не списывает кредиты
  if (settings?.subscriptionPlan === 'ai_pro') return true

  if (!settings || (settings.aiCredits ?? 0) <= 0) return false

  try {
    await prisma.doctorSettings.update({
      where: { doctorId: userId },
      data: { aiCredits: { decrement: 1 } },
    })
    return true
  } catch (error) {
    console.error('[deductAICredit] error:', error)
    return false
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

// Кэш русских labels от Sonnet (rubric → labelRu)
const _labelRuCache = new Map<string, string>()

async function parseTextWithSonnet(text: string): Promise<{
  symptoms: MDRISymptom[]
  modalities: MDRIModality[]
  familyHistory: string[]
}> {
  const client = getAnthropicClient()
  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2000,
    temperature: 0.1, // Стабильность парсинга: один текст = один результат
    system: PARSING_SYSTEM_PROMPT,
    messages: [{ role: 'user', content: text }],
  })

  const responseText = response.content[0].type === 'text' ? response.content[0].text : '{}'
  const jsonStr = responseText.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim()

  try {
    const parsed = JSON.parse(jsonStr)
    // Сохранить русские labels от Sonnet
    _labelRuCache.clear()
    for (const s of (parsed.symptoms ?? [])) {
      if (s.labelRu && s.rubric) {
        _labelRuCache.set(String(s.rubric).toLowerCase(), String(s.labelRu))
      }
    }

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

/**
 * Верификатор: confirmation по Materia Medica (Кент).
 * Sonnet получает top-5 от engine + оригинальный текст и переранжирует.
 * Возвращает переранжированный top-5 или null если не удалось.
 */
async function verifyTop5(
  originalText: string,
  top5: MDRIResult[],
): Promise<MDRIResult[] | null> {
  if (top5.length < 2) return null

  const client = getAnthropicClient()
  const candidates = top5.map((r, i) => `${i + 1}. ${r.remedy}`).join('\n')
  const userMessage = `Текст пациента:\n"${originalText}"\n\nКандидаты от реперторизации (в текущем порядке):\n${candidates}`

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 800,
    temperature: 0.1,
    system: VERIFIER_SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userMessage }],
  })

  const text = response.content[0].type === 'text' ? response.content[0].text : ''
  const jsonStr = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim()

  try {
    const newOrder: { remedy: string; score: number; reasoning: string }[] = JSON.parse(jsonStr)
    if (!Array.isArray(newOrder) || newOrder.length === 0) return null

    // Маппим новый порядок на существующие MDRIResult
    const norm = (s: string) => s.toLowerCase().replace(/\.$/, '')
    const resultMap = new Map(top5.map(r => [norm(r.remedy), r]))
    const reranked: MDRIResult[] = []

    for (const item of newOrder) {
      const found = resultMap.get(norm(item.remedy))
      if (found) {
        reranked.push(found)
        resultMap.delete(norm(item.remedy))
      }
    }

    // Добавить пропущенные (если верификатор пропустил кого-то)
    for (const remaining of resultMap.values()) {
      reranked.push(remaining)
    }

    return reranked.length > 0 ? reranked : null
  } catch {
    return null
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
  // Проверка авторизации
  await requireAuth()
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
- Расплывчатое "болит голова" -> спроси про характер боли (chips-multi: давящая, пульсирующая, колющая, распирающая, тупая...)
- Неполное (нет модальностей) -> спроси что ухудшает/улучшает (chips-multi с основными модальностями)
- Противоречие (мёрзну + хуже от тепла) -> спроси: "Вы упомянули что мёрзнете, но тепло ухудшает. Уточните: (chips)"

Верни ТОЛЬКО JSON массив (без обёрток):
[{"key": "snake_case_key", "label": "Вопрос?", "type": "chips-multi|chips|textarea|text", "options": ["вариант1", "вариант2"], "hint": "Почему важно"}]`,
      messages: [{ role: 'user', content: context || 'Новый пациент, данных нет. Задай базовые вопросы для гомеопатического анализа.' }],
    })

    const responseText = response.content[0].type === 'text' ? response.content[0].text : '[]'
    const jsonStr = responseText.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim()
    const questions = JSON.parse(jsonStr) as AIQuestion[]

    if (!Array.isArray(questions) || questions.length === 0) return getFallbackQuestions()
    // Принудительно: chips с 3+ опциями -> chips-multi (Sonnet иногда игнорирует инструкцию)
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
  // Проверка авторизации
  await requireAuth()
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

    if (!Array.isArray(questions) || questions.length === 0) return getFallbackQuestions()
    return questions.map(q => ({
      ...q,
      type: q.type === 'chips' && q.options && q.options.length > 2 ? 'chips-multi' as const : q.type,
    }))
  } catch {
    return getFallbackQuestions()
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

// === HYBRID PARSING: parse -> suggest -> confirm -> analyze ===

// Словарь перевода rubric -> русский (для UI)
// Словарь перевода симптомов (ключевое слово -> русский)
const RUBRIC_RU: Record<string, string> = {
  // Термика
  'chilly': 'Зябкий', 'hot patient': 'Жаркий', 'frozen': 'Ледяной',
  // Жажда
  'thirstless': 'Нет жажды', 'thirst large quantities': 'Сильная жажда',
  'thirst small sips frequently': 'Пьёт мелкими глотками', 'thirst moderate': 'Умеренная жажда',
  // Утешение
  'consolation aggravates': 'Утешение хуже', 'consolation ameliorates': 'Утешение лучше',
  // Слёзы
  'weeping easily': 'Плаксивость', 'weeping alone': 'Плачет одна',
  // Психика
  'irritability': 'Раздражительность', 'irritability trifles': 'Раздражительность по мелочам',
  'anxiety': 'Тревога', 'anxiety anticipation': 'Тревога ожидания',
  'anxiety health': 'Тревога о здоровье', 'anxiety night': 'Тревога ночью',
  'fear death': 'Страх смерти', 'fear dark': 'Страх темноты',
  'fear alone': 'Страх одиночества', 'fear disease': 'Страх болезни',
  'fear thunderstorm': 'Страх грозы', 'fear poverty': 'Страх бедности',
  'jealousy': 'Ревность', 'jealousy suspicious': 'Ревность с подозрительностью',
  'indifference': 'Безразличие', 'indifference family': 'Безразличие к семье',
  'grief': 'Горе', 'grief suppressed': 'Подавленное горе',
  'anger violent': 'Вспышки гнева', 'anger suppressed': 'Подавленный гнев',
  'restlessness': 'Беспокойство', 'fastidious orderly': 'Педантичность',
  'loquacity': 'Болтливость', 'loquacity talkative': 'Болтливость',
  'sympathetic compassionate': 'Сочувствие', 'obstinate': 'Упрямство',
  'dictatorial domineering': 'Властность', 'mildness': 'Мягкость',
  'emaciation': 'Худеет', 'insomnia': 'Бессонница',
  'theorizing philosophizing': 'Склонность к философствованию',
  // Желания / отвращения
  'desire salt': 'Любит солёное', 'desire sweets': 'Любит сладкое',
  'desire sour': 'Любит кислое', 'desire fat': 'Любит жирное',
  'desire eggs': 'Любит яйца', 'desire ice cream': 'Любит мороженое',
  'desire cold drinks': 'Любит холодные напитки',
  'aversion fat': 'Отвращение к жирному', 'aversion milk': 'Отвращение к молоку',
  'aversion meat': 'Отвращение к мясу',
  // Модальности
  'worse night': 'Хуже ночью', 'worse morning': 'Хуже утром',
  'worse evening': 'Хуже вечером', 'worse after sleep': 'Хуже после сна',
  'worse sun': 'Хуже на солнце', 'worse motion': 'Хуже от движения',
  'worse rest': 'Хуже в покое', 'worse cold': 'Хуже от холода',
  'worse heat': 'Хуже от тепла', 'worse damp': 'Хуже в сырости',
  'worse 4pm 8pm': 'Хуже в 16-20ч', 'worse 2am 4am': 'Хуже в 2-4ч',
  'worse after eating': 'Хуже после еды', 'worse before menses': 'Хуже перед месячными',
  'better motion': 'Лучше от движения', 'better rest': 'Лучше в покое',
  'better warmth': 'Лучше от тепла', 'better cold': 'Лучше от холода',
  'better open air': 'Лучше на свежем воздухе', 'better pressure': 'Лучше от давления',
  'better at sea seashore': 'Лучше на море',
  'first motion aggravates then ameliorates': 'Первое движение хуже, потом лучше',
  'standing aggravates': 'Хуже стоя',
  // Потоотделение
  'perspiration head night': 'Потеет голова ночью', 'perspiration profuse': 'Обильный пот',
  'perspiration cold': 'Холодный пот', 'perspiration feet': 'Потеют стопы',
  // Общее
  'right side': 'Правая сторона', 'left side': 'Левая сторона',
  'burning': 'Жжение', 'pulsating': 'Пульсация',
  'periodicity': 'Периодичность', 'alternating sides': 'Чередование сторон',
  // Сон
  'sleep abdomen': 'Спит на животе', 'sleeplessness': 'Бессонница',
  // Физиология
  'constipation': 'Запор', 'diarrhea': 'Понос',
  'distension abdomen': 'Вздутие живота', 'flatulence': 'Метеоризм',
  'nausea': 'Тошнота', 'vomiting': 'Рвота',
  'headache': 'Головная боль', 'vertigo': 'Головокружение',
  'cough': 'Кашель', 'epistaxis': 'Носовое кровотечение',
  'itching': 'Зуд', 'eczema': 'Экзема', 'urticaria': 'Крапивница',
}

// Перевод структурных частей рубрик (разделы реперторий)
const CHAPTER_RU: Record<string, string> = {
  'mind': 'Психика', 'generalities': 'Общее', 'head': 'Голова',
  'eye': 'Глаза', 'ear': 'Уши', 'nose': 'Нос', 'face': 'Лицо',
  'mouth': 'Рот', 'teeth': 'Зубы', 'throat': 'Горло',
  'stomach': 'Желудок', 'abdomen': 'Живот', 'rectum': 'Прямая кишка',
  'stool': 'Стул', 'bladder': 'Мочевой пузырь', 'kidneys': 'Почки',
  'urethra': 'Уретра', 'genitalia': 'Половые органы',
  'larynx': 'Гортань', 'respiration': 'Дыхание', 'chest': 'Грудь',
  'back': 'Спина', 'extremities': 'Конечности', 'sleep': 'Сон',
  'dreams': 'Сны', 'chill': 'Озноб', 'fever': 'Лихорадка',
  'perspiration': 'Потоотделение', 'skin': 'Кожа',
  'appetite': 'Аппетит', 'vertigo': 'Головокружение',
}

// Перевод общих слов внутри рубрик
const WORD_RU: Record<string, string> = {
  // Боль
  'pain': 'боль', 'burning': 'жгучая', 'pressing': 'давящая',
  'stitching': 'колющая', 'tearing': 'рвущая', 'cramping': 'судорожная',
  'throbbing': 'пульсирующая', 'hammering': 'как молотки', 'sore': 'болезненность',
  // Стороны и время
  'right': 'справа', 'left': 'слева', 'aggravates': 'хуже', 'agg': 'хуже', 'amel': 'лучше',
  'ameliorates': 'лучше', 'worse': 'хуже', 'better': 'лучше',
  'after': 'после', 'before': 'до', 'during': 'во время',
  'morning': 'утром', 'evening': 'вечером', 'night': 'ночью', 'noon': 'в полдень',
  '10am': 'в 10ч', '4pm': 'в 16ч',
  // Температура и среда
  'cold': 'холод', 'heat': 'тепло', 'warmth': 'тепло', 'sun': 'солнце', 'sea': 'море',
  'damp': 'сырость', 'wet': 'влажность', 'draft': 'сквозняк', 'storm': 'гроза',
  'open': 'свежий', 'air': 'воздух', 'room': 'комната', 'warm': 'тёплый', 'stuffy': 'душный',
  // Движение и положение
  'motion': 'движение', 'rest': 'покой', 'eating': 'еда',
  'walking': 'ходьба', 'sitting': 'сидя', 'standing': 'стоя',
  'lying': 'лёжа', 'stooping': 'наклон', 'exertion': 'нагрузка', 'exercise': 'упражнения',
  // Психика
  'grief': 'горе', 'anger': 'гнев', 'anxiety': 'тревога', 'fear': 'страх',
  'irritability': 'раздражительность', 'sadness': 'грусть', 'weeping': 'плач',
  'consolation': 'утешение', 'aversion': 'отвращение', 'desire': 'желание',
  'company': 'общество', 'solitude': 'одиночество', 'silent': 'молчаливый',
  'reserved': 'замкнутый', 'brooding': 'размышления', 'dwells': 'зацикленность',
  'past': 'прошлое', 'indifference': 'равнодушие', 'ailments': 'последствия',
  'disappointed': 'разочарование', 'love': 'любовь', 'suppressed': 'подавленный',
  'jealousy': 'ревность', 'haughty': 'высокомерие', 'hurry': 'спешка',
  'sensitive': 'чувствительный', 'offended': 'обиженный', 'easily': 'легко',
  'changeable': 'переменчивый', 'mood': 'настроение', 'moody': 'переменчивый',
  'weeps': 'плачет', 'alone': 'одна', 'sympathy': 'сочувствие',
  // Общие
  'chilly': 'зябкий', 'hot': 'жаркий', 'thirst': 'жажда', 'thirstless': 'без жажды',
  'salt': 'соль', 'salty': 'солёное', 'sweets': 'сладкое', 'sour': 'кислое',
  'fat': 'жирное', 'eggs': 'яйца', 'milk': 'молоко', 'meat': 'мясо', 'fish': 'рыба',
  'perspiration': 'потоотделение', 'sweat': 'пот', 'profuse': 'обильный',
  'hair': 'волосы', 'loss': 'выпадение', 'falling': 'выпадение',
  // Физические
  'swelling': 'отёк', 'inflammation': 'воспаление',
  'discharge': 'выделения', 'offensive': 'зловонный',
  'itching': 'зуд', 'redness': 'покраснение', 'dryness': 'сухость',
  'cracking': 'трещина', 'lips': 'губы', 'herpes': 'герпес',
  'constipation': 'запор', 'diarrhea': 'понос', 'nausea': 'тошнота',
  'menses': 'месячные', 'delayed': 'задержка', 'scanty': 'скудные', 'dark': 'тёмные',
  'varicose': 'варикоз', 'veins': 'вены', 'heaviness': 'тяжесть',
  'bearing': 'давящее', 'down': 'вниз', 'sensation': 'ощущение',
  'spots': 'пятна', 'discoloration': 'пигментация',
  'headache': 'головная боль', 'head': 'голова', 'vertigo': 'головокружение',
}

function rubricToRussian(rubric: string): string {
  const r = rubric.toLowerCase()
  // 0. Русский label от Sonnet (самый точный перевод)
  const sonnetLabel = _labelRuCache.get(r)
  if (sonnetLabel) return sonnetLabel

  // 1. Точное совпадение по ключу
  for (const [key, val] of Object.entries(RUBRIC_RU)) {
    if (r.includes(key)) return val
  }
  // 2. Пословный перевод: раздел + ключевые слова
  const parts = r.split(/[,;]+/).map(s => s.trim()).filter(Boolean)
  if (parts.length > 0) {
    const translated = parts.map(part => {
      const words = part.split(/\s+/)
      return words.map(w => CHAPTER_RU[w] ?? WORD_RU[w] ?? null).filter(Boolean).join(' ')
    }).filter(p => p.length > 0)
    if (translated.length > 0) return translated.join(', ')
  }
  // 3. Хотя бы раздел
  const firstWord = r.split(/[\s,]/)[0]
  if (CHAPTER_RU[firstWord]) {
    return CHAPTER_RU[firstWord] + ': ' + r.split(',').slice(1).join(',').trim()
  }
  // 4. Fallback: перевести раздел + оставить ключевые слова
  // Пример: "Mind, grief, silent" -> "Психика: grief, silent"
  const parts2 = r.split(/[,;]+/).map(s => s.trim()).filter(Boolean)
  if (parts2.length >= 2) {
    const chapter = CHAPTER_RU[parts2[0]] ?? parts2[0]
    const rest = parts2.slice(1).map(p => {
      const words = p.split(/\s+/)
      return words.map(w => WORD_RU[w] ?? w).join(' ')
    }).join(', ')
    return chapter + ': ' + rest
  }
  return rubric
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
 * Шаг 1: Парсинг текста -> suggestions для подтверждения
 */
export async function parseAndSuggest(input: { text: string }): Promise<ParseSuggestionsResult> {
  await requireAuth()

  const parseResult = await parseTextWithSonnet(input.text)
  const { symptoms, modalities, warnings, conflicts } = mergeWithFallback(
    input.text, parseResult.symptoms, parseResult.modalities,
  )

  const hasConflicts = conflicts.length > 0

  // Базовый приоритет до ограничений
  function basePriority(type: string, weight: number, source: string): 'high' | 'medium' | 'low' {
    // keyword-only с низким весом -> не доверяем
    if (source === 'keyword' && weight <= 1) return 'low'
    // weight=3 или mental с weight>=2 -> high
    if (weight >= 3) return 'high'
    if (type === 'mental' && weight >= 2) return 'high'
    // modality -> medium (не high по умолчанию, только weight=3 модальности -> high)
    if (type === 'modality') return 'medium'
    // weight=2 или general -> medium
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

  // Модальности -> medium по умолчанию (high только при weight=3)
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

  // 0. Weak symptom filter: слишком общие -> max medium
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

  // 2. Cap high -> medium
  let highCount = 0
  for (const s of suggestions) {
    if (s.priority === 'high') {
      highCount++
      if (highCount > MAX_HIGH) s.priority = 'medium'
    }
  }

  // 3. Cap medium -> low
  let mediumCount = 0
  for (const s of suggestions) {
    if (s.priority === 'medium') {
      mediumCount++
      if (mediumCount > MAX_MEDIUM) s.priority = 'low'
    }
  }

  // 4. Conflict safety: downgrade high -> medium (не обнуляем confirmed)
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
  const { userId } = await requireAuth()
  await checkAIAccess(userId)

  const confirmed = input.suggestions.filter(s => s.confirmed)

  // Priority -> weight множитель: high=1.0, medium=0.5, low=0.2
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
  const mdriResults = analyzeWithIdf(data, symptoms, modalities, input.familyHistory, profile)

  // Перевод matchedRubrics на русский
  for (const r of mdriResults) {
    if (r.matchedRubrics) r.matchedRubrics = r.matchedRubrics.map(rubricToRussian)
  }

  const productConfidence = computeConfidence(symptoms, modalities, mdriResults,
    validateInput(symptoms, modalities))

  // Сохраняем русские labels подтверждённых симптомов для UI
  const usedSymptoms = confirmed
    .filter(s => s.confirmed)
    .map(s => ({ label: s.label, type: s.type }))

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
    usedSymptoms,
  }

  // Сохранить результат (с проверкой владельца)
  if (input.consultationId) {
    await prisma.consultation.updateMany({
      where: { id: input.consultationId, doctorId: userId },
      data: { aiResult: result as unknown as Record<string, unknown>, source: 'ai' },
    })
  }

  // Логирование: confirmed input + engine top-3 + confidence + аналитика
  const inputWarnings = validateInput(symptoms, modalities)
  try {
    await prisma.aiAnalysisLog.create({
      data: {
        userId,
        consultationId: input.consultationId ?? null,
        confirmedInput: confirmed.map(s => ({ rubric: s.rubric, type: s.type, priority: s.priority, weight: s.weight })),
        engineTop3: mdriResults.slice(0, 3).map(r => ({ remedy: r.remedy, score: r.totalScore })),
        confidenceLevel: productConfidence?.level ?? null,
        warnings: inputWarnings.length > 0 ? inputWarnings : null,
        symptomCount: symptoms.length,
        modalityCount: modalities.length,
        hasConflict: inputWarnings.some(w => w.type === 'uncertain_parse'),
        // Аналитика
        highCount: confirmed.filter(s => s.priority === 'high').length,
        mediumCount: confirmed.filter(s => s.priority === 'medium').length,
        lowCount: confirmed.filter(s => s.priority === 'low').length,
        mentalCount: confirmed.filter(s => s.type === 'mental').length,
      },
    })
  } catch { /* логирование не должно ломать анализ */ }

  await deductAICredit(userId)
  return result
}

/**
 * Логирование выбора врача (silent feedback)
 * Вызывается при назначении препарата после AI-анализа
 */
export async function logDoctorChoice(consultationId: string, chosenRemedy: string) {
  const { userId } = await requireAuth()

  try {
    // Получаем лог чтобы вычислить correctPosition
    const logEntry = await prisma.aiAnalysisLog.findFirst({
      where: { consultationId, userId },
      select: { id: true, engineTop3: true },
    })

    let correctPosition: number | null = null
    if (logEntry?.engineTop3) {
      const top3 = logEntry.engineTop3 as Array<{ remedy: string }>
      const idx = top3.findIndex(r => r.remedy.toLowerCase() === chosenRemedy.toLowerCase())
      correctPosition = idx >= 0 ? idx + 1 : null // 1, 2, 3 или null (не в top-3)
    }

    if (logEntry) {
      await prisma.aiAnalysisLog.update({
        where: { id: logEntry.id },
        data: { doctorChoice: chosenRemedy, correctPosition },
      })
    }
  } catch { /* silent */ }
}

/**
 * Логирование результата clarify (QuestionGain)
 */
export async function logClarifyResult(data: {
  clarifyUsed: boolean
  clarifyFeature?: string
  clarifyGain?: number
  clarifyAnswer?: string
  beforeTop3?: { remedy: string; score: number }[]
  afterTop3?: { remedy: string; score: number }[]
  top1Changed?: boolean
  gapBefore?: number
  gapAfter?: number
  flipBlocked?: boolean
  skipReason?: string
}) {
  const { userId } = await requireAuth()

  try {
    // Записываем в последний лог пользователя
    const lastLog = await prisma.aiAnalysisLog.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: { id: true },
    })

    if (lastLog) {
      await prisma.aiAnalysisLog.update({
        where: { id: lastLog.id },
        data: { clarifyLog: data },
      })
    }
  } catch { /* silent */ }
}

/**
 * Doctor feedback из Direct flow (без consultation_id)
 * Записывает doctor_choice в последний лог пользователя
 */
export async function logDoctorFeedback(chosenRemedy: string) {
  const { userId } = await requireAuth()

  try {
    const lastLog = await prisma.aiAnalysisLog.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: { id: true, engineTop3: true },
    })

    if (lastLog) {
      // Вычислить correctPosition
      let correctPosition: number | null = null
      if (lastLog.engineTop3) {
        const top3 = lastLog.engineTop3 as Array<{ remedy: string }>
        const idx = top3.findIndex(r =>
          r.remedy.toLowerCase().replace(/\.$/, '') === chosenRemedy.toLowerCase().replace(/\.$/, '')
        )
        correctPosition = idx >= 0 ? idx + 1 : null
      }

      await prisma.aiAnalysisLog.update({
        where: { id: lastLog.id },
        data: { doctorChoice: chosenRemedy, correctPosition },
      })
    }
  } catch { /* silent */ }
}

/**
 * Врач не согласен с рекомендацией — выбрал другое средство.
 * Логирует расхождение + причину для калибровки engine.
 */
export async function logDisagreement(chosenRemedy: string, reason: string) {
  const { userId } = await requireAuth()

  try {
    const lastLog = await prisma.aiAnalysisLog.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: { id: true, engineTop3: true },
    })

    if (lastLog) {
      let correctPosition: number | null = null
      if (lastLog.engineTop3) {
        const top3 = lastLog.engineTop3 as Array<{ remedy: string }>
        const idx = top3.findIndex(r =>
          r.remedy.toLowerCase().replace(/\.$/, '') === chosenRemedy.toLowerCase().replace(/\.$/, '')
        )
        correctPosition = idx >= 0 ? idx + 1 : null
      }

      await prisma.aiAnalysisLog.update({
        where: { id: lastLog.id },
        data: {
          doctorChoice: chosenRemedy,
          correctPosition,
          disagreement: { chosenRemedy, reason, timestamp: new Date().toISOString() },
        },
      })
    }
  } catch { /* silent */ }
}

/**
 * Clarify Engine v3: discriminator-first.
 *
 * Flow: shouldClarify -> selectPair -> buildMatrix -> selectDiscriminator ->
 *       known? -> детерминированный вопрос (без AI)
 *       unknown? -> AI формулирует 1 вопрос от discriminator
 *
 * Максимум 1 вопрос. AI не выбирает — только формулирует.
 */
export async function generateDifferentialClarifying(input: {
  results: MDRIResult[]
  symptoms: MDRISymptom[]
  modalities: MDRIModality[]
  clarifyUsed?: boolean
}): Promise<{
  questions: import('@/lib/mdri/differential').DifferentialQuestion[]
  aiGenerated: boolean; rawCount: number; validCount: number
  pair?: import('@/lib/mdri/clarify-engine').DifferentialPair
  matrix?: import('@/lib/mdri/clarify-engine').DifferentialMatrix
  source?: 'known' | 'ai' | 'fallback'
}> {
  // Проверка авторизации
  await requireAuth()

  const { shouldClarify: shouldClarifyFn, parseDifferentialResponse, validateQuestions, getFallbackQuestions, buildDifferentialContext } = await import('@/lib/mdri/differential')
  const { selectDifferentialPair, buildDifferentialMatrix, selectBestDiscriminator, discriminatorToQuestion, buildAIDiscriminatorPrompt, runClarifyEngine } = await import('@/lib/mdri/clarify-engine')
  const { checkHypothesisConflict, computeConfidence, validateInput } = await import('@/lib/mdri/product-layer')

  const conflict = checkHypothesisConflict(input.results)
  const confidence = computeConfidence(input.symptoms, input.modalities, input.results, validateInput(input.symptoms, input.modalities))

  if (!shouldClarifyFn(confidence, input.results, conflict, input.clarifyUsed)) {
    return { questions: [], aiGenerated: false, rawCount: 0, validCount: 0 }
  }

  // 1. Pair + matrix
  const pair = selectDifferentialPair(input.results, conflict)
  if (!pair) {
    const fb = getFallbackQuestions(conflict.differentialLenses)
    return { questions: fb, aiGenerated: false, rawCount: 0, validCount: fb.length, source: 'fallback' }
  }
  const matrix = buildDifferentialMatrix(input.results, pair)

  // 2. Known discriminator? -> детерминированный вопрос (без AI)
  const disc = selectBestDiscriminator(matrix, input.symptoms, input.modalities)
  if (disc) {
    const question = discriminatorToQuestion(disc, pair)
    return { questions: [question], aiGenerated: false, rawCount: 0, validCount: 1, pair, matrix, source: 'known' }
  }

  // 3. No known -> AI формулирует 1 вопрос
  try {
    const prompt = buildAIDiscriminatorPrompt(matrix, input.symptoms, input.modalities)
    const client = getAnthropicClient()
    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514', max_tokens: 800, temperature: 0.3,
      messages: [{ role: 'user', content: prompt }],
    })
    const text = response.content[0].type === 'text' ? response.content[0].text : '{}'
    // Парсим 1 объект (не массив)
    const clean = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim()
    let parsed: import('@/lib/mdri/differential').DifferentialQuestion[]
    try {
      const obj = JSON.parse(clean)
      parsed = Array.isArray(obj) ? parseDifferentialResponse(text) : parseDifferentialResponse(`[${clean}]`)
    } catch {
      parsed = parseDifferentialResponse(text)
    }

    const ctx = buildDifferentialContext(input.results, input.symptoms, input.modalities, conflict)
    const validated = validateQuestions(parsed, ctx)

    if (validated.length > 0) {
      return { questions: [validated[0]], aiGenerated: true, rawCount: parsed.length, validCount: 1, pair, matrix, source: 'ai' }
    }
  } catch { /* AI unavailable */ }

  // 4. Fallback
  const fb = getFallbackQuestions(matrix.discriminators.length > 0 ? matrix.discriminators : conflict.differentialLenses)
  return { questions: fb.slice(0, 1), aiGenerated: false, rawCount: 0, validCount: fb.length > 0 ? 1 : 0, pair, matrix, source: 'fallback' }
}

/**
 * Пересчёт после clarify: merge ответов с текущими симптомами -> rerun engine
 */
export async function rerunWithClarifications(input: {
  consultationId?: string
  originalSuggestions: ParsedSuggestion[]
  familyHistory: string[]
  clarifyAnswers: Record<string, string>
  clarifyQuestions: import('@/lib/mdri/differential').DifferentialQuestion[]
  // Before state для измерения эффективности
  beforeResults?: MDRIResult[]
  beforeConfidence?: string
  beforeConflict?: string
  clarifyMeta?: { aiUsed: boolean; fallbackUsed: boolean; validCount: number }
}): Promise<ConsensusResult & { clarifyAdded: { symptoms: number; modalities: number }; clarifyExplain: string[]; clarifyEffectiveness?: import('@/lib/mdri/differential').ClarifyEffectiveness }> {
  const { userId } = await requireAuth()

  const { convertAnswersToSymptoms, CaseLogBuilder } = await import('@/lib/mdri/differential')
  const { checkHypothesisConflict } = await import('@/lib/mdri/product-layer')

  // Единый лог-объект
  const caseLog = new CaseLogBuilder(input.consultationId ?? null, 'confirmed')

  const confirmed = input.originalSuggestions.filter(s => s.confirmed)
  const PW: Record<string, number> = { high: 1.0, medium: 0.5, low: 0.2 }

  const originalSymptoms: MDRISymptom[] = confirmed
    .filter(s => s.type !== 'modality')
    .map(s => ({
      rubric: s.rubric,
      category: (s.type === 'mental' ? 'mental' : s.type === 'general' ? 'general' : 'particular') as MDRISymptomCategory,
      present: true,
      weight: Math.max(1, Math.min(3, Math.round(s.weight * (PW[s.priority] ?? 0.5)))) as 1 | 2 | 3,
    }))

  const originalModalities: MDRIModality[] = confirmed
    .filter(s => s.type === 'modality')
    .map(s => { const [pairId, value] = s.rubric.split(':'); return { pairId, value: value as 'agg' | 'amel' } })

  // Конвертируем clarify ответы (детерминированный маппинг через OptionWithMapping)
  const { symptoms: clarifySymptoms, modalities: clarifyModalities } = convertAnswersToSymptoms(input.clarifyQuestions, input.clarifyAnswers)

  // Merge (не затираем исходные)
  const allSymptoms = [...originalSymptoms, ...clarifySymptoms]
  const allModalities = [...originalModalities]
  for (const cm of clarifyModalities) {
    if (!allModalities.some(m => m.pairId === cm.pairId)) allModalities.push(cm)
  }

  if (allSymptoms.length === 0) throw new Error('Нет симптомов')

  // Rerun engine
  const data = await loadMDRIData()
  const mdriResults = analyzeWithIdf(data, allSymptoms, allModalities, input.familyHistory, DEFAULT_PROFILE)
  for (const r of mdriResults) {
    if (r.matchedRubrics) r.matchedRubrics = r.matchedRubrics.map(rubricToRussian)
  }
  const productConfidence = computeConfidence(allSymptoms, allModalities, mdriResults, validateInput(allSymptoms, allModalities))

  // Explainability
  const clarifyExplain: string[] = []
  for (const [key, answer] of Object.entries(input.clarifyAnswers)) {
    const q = input.clarifyQuestions.find(cq => cq.key === key)
    if (q) clarifyExplain.push(`${q.question} -> ${answer}`)
  }

  const topRemedy = mdriResults[0]?.remedy ?? ''
  const usedSymptoms = allSymptoms.map(s => ({
    label: rubricToRussian(s.rubric),
    type: (s.category === 'mental' ? 'mental' : s.category === 'general' ? 'general' : 'particular') as 'mental' | 'general' | 'modality' | 'particular',
  }))

  // Измерение эффективности clarify
  const afterConflict = checkHypothesisConflict(mdriResults)
  const { measureClarifyEffectiveness } = await import('@/lib/mdri/differential')
  let clarifyEffectiveness: import('@/lib/mdri/differential').ClarifyEffectiveness | undefined

  // Собираем before в лог
  if (input.beforeResults) {
    const beforeConflict = input.beforeConflict ?? 'none'
    caseLog.setInput(originalSymptoms, originalModalities, validateInput(originalSymptoms, originalModalities))
    caseLog.setBefore(input.beforeResults, input.beforeConfidence ?? 'clarify', beforeConflict, [])

    clarifyEffectiveness = measureClarifyEffectiveness(
      input.beforeResults, mdriResults,
      input.beforeConfidence ?? 'clarify',
      productConfidence?.level ?? 'clarify',
      beforeConflict,
      afterConflict.level,
      {
        aiUsed: input.clarifyMeta?.aiUsed ?? false,
        fallbackUsed: input.clarifyMeta?.fallbackUsed ?? false,
        validCount: input.clarifyMeta?.validCount ?? input.clarifyQuestions.length,
        answersCount: Object.keys(input.clarifyAnswers).length,
      },
    )

    // Clarify details в лог
    caseLog.setAnswers(input.clarifyQuestions, input.clarifyAnswers, clarifySymptoms, clarifyModalities)
    caseLog.setAfter(mdriResults, productConfidence?.level ?? 'clarify', afterConflict.level)

    // Effectiveness debug
    const gapDelta = clarifyEffectiveness.delta_gap
    const maxPDelta = clarifyEffectiveness.max_alt_pressure_before - clarifyEffectiveness.max_alt_pressure_after
    const contradictionPenalty = gapDelta > 0 && maxPDelta < 0
    const conflictBonus = beforeConflict !== 'none' && afterConflict.level === 'none'
    caseLog.setEffectiveness(clarifyEffectiveness,
      // improvementScore пересчитаем для лога
      0.5 * Math.min(1, Math.max(0, maxPDelta / 0.10)) +
      0.3 * Math.min(1, Math.max(0, gapDelta / 10)) +
      0.2 * Math.min(1, Math.max(0, (clarifyEffectiveness.alt_pressure_before - clarifyEffectiveness.alt_pressure_after) / 0.10)),
      contradictionPenalty, conflictBonus,
    )
  }

  const result = {
    method: 'consensus' as const,
    finalRemedy: topRemedy, sonnetRemedy: topRemedy, mdriRemedy: topRemedy,
    mdriResults, aiResult: null, cost: 0.02,
    productConfidence, warnings: validateInput(allSymptoms, allModalities),
    usedSymptoms,
    clarifyAdded: { symptoms: clarifySymptoms.length, modalities: clarifyModalities.length },
    clarifyExplain,
    clarifyEffectiveness,
  }

  // Сохранить результат (с проверкой владельца)
  if (input.consultationId) {
    await prisma.consultation.updateMany({
      where: { id: input.consultationId, doctorId: userId },
      data: { aiResult: result as unknown as Record<string, unknown>, source: 'ai' },
    })
  }

  // Единый лог: полный CaseAnalysisLog в JSONB
  const fullLog = caseLog.build()
  try {
    await prisma.aiAnalysisLog.create({
      data: {
        userId,
        consultationId: input.consultationId ?? null,
        confirmedInput: [...confirmed.map(s => ({ rubric: s.rubric, type: s.type, priority: s.priority, weight: s.weight })),
          ...clarifySymptoms.map(s => ({ rubric: s.rubric, type: s.category, priority: 'clarify', weight: s.weight }))],
        engineTop3: mdriResults.slice(0, 3).map(r => ({ remedy: r.remedy, score: r.totalScore })),
        confidenceLevel: productConfidence?.level ?? null,
        warnings: fullLog, // Полный CaseAnalysisLog в JSONB
        symptomCount: allSymptoms.length,
        modalityCount: allModalities.length,
        hasConflict: afterConflict.hasConflict,
      },
    })
  } catch { /* не ломаем flow */ }

  return result
}
