'use client'

import { useState, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { t } from '@/lib/i18n'
import {
  analyzeText,
  generateQuestions,
  generateClarifyingQuestions,
  summarizePatientHistory,
} from '@/lib/actions/ai-consultation'
import type { AIQuestion } from '@/lib/actions/ai-consultation'
// createAIConsultation убран — консультация создаётся при назначении
import AIResultPanel from '@/components/AIResultPanel'
import AIOnboarding from '@/components/AIOnboarding'
import type { Patient, Consultation, IntakeForm } from '@/types'
import type { MDRIPatientProfile, ConsensusResult } from '@/lib/mdri/types'
import type { Lang } from '@/hooks/useLanguage'

// === Типы ===

type Mode = 'K' | 'I'

// Шаги для существующего пациента (K)
type StepK = 'summary' | 'additions' | 'questions' | 'analyzing' | 'result' | 'clarify'
// Шаги для нового пациента (I)
type StepI = 'input' | 'questions' | 'analyzing' | 'result' | 'clarify'

type Props = {
  patient: Patient
  consultations: Consultation[]
  intakeForms: IntakeForm[]
  lang: Lang
}

// === Компонент ===

export default function AIConsultationClient({ patient, consultations, intakeForms, lang }: Props) {
  const router = useRouter()
  const s = t(lang).ai.consultation
  const hasHistory = consultations.length > 0

  // Режим: K для существующих, I для новых
  const [mode, setMode] = useState<Mode>(hasHistory ? 'K' : 'I')

  // Шаги
  const [stepK, setStepK] = useState<StepK>('summary')
  const [stepI, setStepI] = useState<StepI>('input')

  // Данные
  const [summary, setSummary] = useState<string>('')
  const [summaryLoading, setSummaryLoading] = useState(false)
  const [additions, setAdditions] = useState('')
  const [freeText, setFreeText] = useState('')
  const [questions, setQuestions] = useState<AIQuestion[]>([])
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({})
  const [questionsLoading, setQuestionsLoading] = useState(false)

  // Профиль
  const [profile, setProfile] = useState<MDRIPatientProfile>({
    acuteOrChronic: 'chronic',
    vitality: 'medium',
    sensitivity: 'medium',
    age: 'adult',
  })

  // AI результат
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<ConsensusResult | null>(null)

  // Уточнения
  const [clarifyQuestions, setClarifyQuestions] = useState<AIQuestion[]>([])
  const [clarifyAnswers, setClarifyAnswers] = useState<Record<string, string | string[]>>({})
  const [clarifyIteration, setClarifyIteration] = useState(0)
  const [clarifyLoading, setClarifyLoading] = useState(false)

  // Загрузка сводки при первом входе в режим K
  const [summaryLoaded, setSummaryLoaded] = useState(false)

  // Загрузить сводку
  const loadSummary = useCallback(async () => {
    if (summaryLoaded) return
    setSummaryLoading(true)
    try {
      const consultationData = consultations.map(c => ({
        date: c.date,
        complaints: c.complaints ?? '',
        remedy: c.remedy ?? null,
        potency: c.potency ?? null,
        reaction_to_previous: c.reaction_to_previous ?? null,
        notes: c.notes ?? '',
      }))
      // Ответы из анкет (берём последнюю)
      const lastIntake = intakeForms.length > 0 ? intakeForms[0] : null
      const intakeAnswers = (lastIntake?.answers as Record<string, string>) ?? null
      const text = await summarizePatientHistory(consultationData, intakeAnswers)
      setSummary(text)
      setSummaryLoaded(true)
    } catch {
      setSummary('')
      setSummaryLoaded(true)
    } finally {
      setSummaryLoading(false)
    }
  }, [consultations, intakeForms, summaryLoaded])

  // Загружаем сводку при рендере если режим K
  useMemo(() => {
    if (mode === 'K' && hasHistory && !summaryLoaded) {
      loadSummary()
    }
  }, [mode, hasHistory, summaryLoaded, loadSummary])

  // Сгенерировать вопросы
  const handleGenerateQuestions = useCallback(async (additionalText: string, historyText: string) => {
    setQuestionsLoading(true)
    setError(null)
    try {
      const qs = await generateQuestions(additionalText, historyText || undefined)
      setQuestions(qs)
      setAnswers({})
      if (mode === 'K') setStepK('questions')
      else setStepI('questions')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка генерации вопросов')
    } finally {
      setQuestionsLoading(false)
    }
  }, [mode])

  // Обновить ответ на вопрос
  const updateAnswer = useCallback((key: string, value: string | string[]) => {
    setAnswers(prev => ({ ...prev, [key]: value }))
  }, [])

  // Обновить ответ на уточняющий вопрос
  const updateClarifyAnswer = useCallback((key: string, value: string | string[]) => {
    setClarifyAnswers(prev => ({ ...prev, [key]: value }))
  }, [])

  // Переключить chip в ответе
  const toggleChip = useCallback((key: string, option: string, multi: boolean, isClarify: boolean) => {
    const setter = isClarify ? setClarifyAnswers : setAnswers
    setter(prev => {
      const current = prev[key]
      if (multi) {
        const arr = Array.isArray(current) ? current : []
        return { ...prev, [key]: arr.includes(option) ? arr.filter(v => v !== option) : [...arr, option] }
      }
      return { ...prev, [key]: option }
    })
  }, [])

  // Собрать текст из ответов
  const buildAnswersText = useCallback((qs: AIQuestion[], ans: Record<string, string | string[]>) => {
    return qs.map(q => {
      const val = ans[q.key]
      const answer = Array.isArray(val) ? val.join(', ') : (val ?? '')
      return `${q.label}\n${answer}`
    }).filter(a => a.trim()).join('\n\n')
  }, [])

  // Запуск анализа
  const runAnalysis = useCallback(async (answersText: string) => {
    setLoading(true)
    setError(null)
    setResult(null)
    if (mode === 'K') setStepK('analyzing')
    else setStepI('analyzing')

    try {
      // Собираем полный текст: история + дополнения + ответы
      let fullText = ''
      if (mode === 'K') {
        if (summary) fullText += `История пациента:\n${summary}\n\n`
        if (additions) fullText += `Дополнение врача:\n${additions}\n\n`
      } else {
        if (freeText) fullText += `Описание случая:\n${freeText}\n\n`
      }
      fullText += `Ответы на вопросы:\n${answersText}`

      const aiResult = await analyzeText({
        text: fullText,
        profile,
      })

      setResult(aiResult)
      if (mode === 'K') setStepK('result')
      else setStepI('result')
    } catch (e) {
      console.error('[AI Analysis Error]', e)
      const msg = e instanceof Error ? e.message : String(e)
      if (msg === 'NO_AI_ACCESS') {
        setError(t(lang).ai.noAccess)
      } else if (msg.includes('NEXT_REDIRECT')) {
        // Server action вызвал redirect — перезагружаем
        window.location.reload()
        return
      } else {
        setError(`Ошибка анализа: ${msg}`)
      }
      if (mode === 'K') setStepK('questions')
      else setStepI('questions')
    } finally {
      setLoading(false)
    }
  }, [mode, patient.id, profile, freeText, additions, summary, lang])

  // Обработка уточняющих вопросов
  const handleClarify = useCallback(async () => {
    if (!result || clarifyIteration >= MAX_CLARIFY_ROUNDS) return
    setClarifyLoading(true)
    setError(null)
    try {
      const topRemedies = result.mdriResults.slice(0, 3).map(r => ({
        remedy: r.remedy,
        score: r.totalScore,
        confidence: r.confidence,
      }))
      const currentSymptoms = result.mdriResults[0]?.lenses.map(l => l.name) ?? []
      const qs = await generateClarifyingQuestions(currentSymptoms, topRemedies)
      setClarifyQuestions(qs)
      setClarifyAnswers({})
      if (mode === 'K') setStepK('clarify')
      else setStepI('clarify')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка')
    } finally {
      setClarifyLoading(false)
    }
  }, [result, clarifyIteration, mode])

  // Повторный анализ после уточнений
  const reanalyze = useCallback(async () => {
    const clarifyText = buildAnswersText(clarifyQuestions, clarifyAnswers)
    setClarifyIteration(prev => prev + 1)
    await runAnalysis(buildAnswersText(questions, answers) + '\n\n' + clarifyText)
  }, [clarifyQuestions, clarifyAnswers, questions, answers, buildAnswersText, runAnalysis])

  // Назначить из результата
  const handleAssignRemedy = useCallback(() => {
    router.push(`/patients/${patient.id}`)
  }, [router, patient.id])

  // AI дозадаёт вопросы пока top-1 score < 60%
  const MIN_CONFIDENCE_SCORE = 60
  const MAX_CLARIFY_ROUNDS = 3

  const needsClarification = useMemo(() => {
    if (!result || clarifyIteration >= MAX_CLARIFY_ROUNDS) return false
    const top = result.mdriResults[0]
    if (!top) return false
    return top.totalScore < MIN_CONFIDENCE_SCORE
  }, [result, clarifyIteration])

  // Callback для AIResultPanel.onClarify
  const handleClarifyFromPanel = useCallback((qs: AIQuestion[]) => {
    setClarifyQuestions(qs)
    setClarifyAnswers({})
    if (mode === 'K') setStepK('clarify')
    else setStepI('clarify')
  }, [mode])

  // === Рендер вопросов ===
  const renderQuestions = (qs: AIQuestion[], ans: Record<string, string | string[]>, isClarify: boolean) => (
    <div className="space-y-4">
      {qs.map(q => (
        <div key={q.key} className="bg-white/[0.06] border border-white/[0.08] rounded-2xl p-4 space-y-2">
          <label className="text-sm font-medium text-white">{q.label}</label>
          {q.hint && <p className="text-xs text-indigo-300/70">{q.hint}</p>}

          {(q.type === 'chips' || q.type === 'chips-multi') && q.options && (
            <div className="flex flex-wrap gap-1.5">
              {q.options.map(opt => {
                const current = ans[q.key]
                const isActive = q.type === 'chips-multi'
                  ? (Array.isArray(current) && current.includes(opt))
                  : current === opt
                return (
                  <button
                    key={opt}
                    onClick={() => toggleChip(q.key, opt, q.type === 'chips-multi', isClarify)}
                    className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
                      isActive
                        ? 'bg-indigo-600 text-white border-indigo-500'
                        : 'bg-white/[0.06] border-white/[0.1] text-indigo-200 hover:border-indigo-400'
                    }`}
                  >
                    {opt}
                  </button>
                )
              })}
            </div>
          )}

          {(q.type === 'textarea' || q.type === 'text') && (
            <textarea
              value={(typeof ans[q.key] === 'string' ? ans[q.key] : '') as string}
              onChange={e => isClarify ? updateClarifyAnswer(q.key, e.target.value) : updateAnswer(q.key, e.target.value)}
              placeholder={s.answerPlaceholder}
              rows={q.type === 'textarea' ? 3 : 1}
              className="w-full text-sm px-3 py-2 rounded-xl bg-white/[0.06] border border-white/[0.1] text-white placeholder:text-indigo-300/40 resize-none focus:outline-none focus:border-indigo-400"
            />
          )}
        </div>
      ))}
    </div>
  )

  // === Рендер профиля пациента ===
  const renderProfile = () => (
    <div className="bg-white/[0.06] border border-white/[0.08] rounded-2xl p-4 space-y-3">
      <h3 className="text-xs font-semibold text-indigo-200">{s.profile}</h3>

      {/* Тип случая */}
      <div className="space-y-1">
        <span className="text-[10px] text-indigo-300/60 uppercase tracking-wider">{s.acuteChronic}</span>
        <div className="flex gap-1">
          {(['acute', 'chronic'] as const).map(v => (
            <button
              key={v}
              onClick={() => setProfile(p => ({ ...p, acuteOrChronic: v }))}
              className={`text-[11px] px-3 py-1 rounded-full border transition-all ${
                profile.acuteOrChronic === v
                  ? 'bg-indigo-600 text-white border-indigo-500'
                  : 'bg-white/[0.06] border-white/[0.1] text-indigo-200 hover:border-indigo-400'
              }`}
            >
              {v === 'acute' ? s.acute : s.chronic}
            </button>
          ))}
        </div>
      </div>

      {/* Витальность */}
      <div className="space-y-1">
        <span className="text-[10px] text-indigo-300/60 uppercase tracking-wider">{s.vitality}</span>
        <div className="flex gap-1">
          {(['high', 'medium', 'low'] as const).map(v => (
            <button
              key={v}
              onClick={() => setProfile(p => ({ ...p, vitality: v }))}
              className={`text-[11px] px-3 py-1 rounded-full border transition-all ${
                profile.vitality === v
                  ? 'bg-indigo-600 text-white border-indigo-500'
                  : 'bg-white/[0.06] border-white/[0.1] text-indigo-200 hover:border-indigo-400'
              }`}
            >
              {v === 'high' ? s.high : v === 'medium' ? s.medium : s.low}
            </button>
          ))}
        </div>
      </div>

      {/* Чувствительность */}
      <div className="space-y-1">
        <span className="text-[10px] text-indigo-300/60 uppercase tracking-wider">{s.sensitivity}</span>
        <div className="flex gap-1">
          {(['high', 'medium', 'low'] as const).map(v => (
            <button
              key={v}
              onClick={() => setProfile(p => ({ ...p, sensitivity: v }))}
              className={`text-[11px] px-3 py-1 rounded-full border transition-all ${
                profile.sensitivity === v
                  ? 'bg-indigo-600 text-white border-indigo-500'
                  : 'bg-white/[0.06] border-white/[0.1] text-indigo-200 hover:border-indigo-400'
              }`}
            >
              {v === 'high' ? s.high : v === 'medium' ? s.medium : s.low}
            </button>
          ))}
        </div>
      </div>

      {/* Возраст */}
      <div className="space-y-1">
        <span className="text-[10px] text-indigo-300/60 uppercase tracking-wider">{s.age}</span>
        <div className="flex gap-1">
          {(['child', 'adult', 'elderly'] as const).map(v => (
            <button
              key={v}
              onClick={() => setProfile(p => ({ ...p, age: v }))}
              className={`text-[11px] px-3 py-1 rounded-full border transition-all ${
                profile.age === v
                  ? 'bg-indigo-600 text-white border-indigo-500'
                  : 'bg-white/[0.06] border-white/[0.1] text-indigo-200 hover:border-indigo-400'
              }`}
            >
              {v === 'child' ? s.child : v === 'adult' ? s.adult : s.elderly}
            </button>
          ))}
        </div>
      </div>
    </div>
  )

  // Текущий шаг
  const currentStep = mode === 'K' ? stepK : stepI

  return (
    <div className="min-h-screen bg-[#1e1b4b]">
      {/* AIOnboarding */}
      <AIOnboarding />

      {/* Шапка */}
      <div className="border-b border-white/[0.08] bg-white/[0.03]">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link
            href={`/patients/${patient.id}`}
            className="text-xs text-indigo-300 hover:text-white transition-colors flex items-center gap-1"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
            {s.backToPatient}
          </Link>
          <span className="text-white/20">|</span>
          <span className="text-xs text-indigo-200/60 truncate">{patient.name}</span>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6 ai-fade-in">

        {/* Заголовок */}
        <div className="text-center">
          <h1 className="text-lg font-bold text-white flex items-center justify-center gap-2">
            <svg className="w-5 h-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
            </svg>
            {s.title}
          </h1>
        </div>

        {/* Переключатель K/I */}
        <div className="flex gap-1 bg-white/[0.06] rounded-xl p-1">
          <button
            onClick={() => setMode('K')}
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-all ${
              mode === 'K'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-indigo-300 hover:text-white'
            }`}
          >
            {s.modeK}
          </button>
          <button
            onClick={() => setMode('I')}
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-all ${
              mode === 'I'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-indigo-300 hover:text-white'
            }`}
          >
            {s.modeI}
          </button>
        </div>

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* Режим K: по карточке */}
        {/* ═══════════════════════════════════════════════════════════ */}
        {mode === 'K' && (
          <div className="space-y-4 ai-slide-up">

            {/* Шаг 1: Сводка */}
            {stepK === 'summary' && (
              <>
                {summaryLoading ? (
                  <div className="bg-white/[0.06] border border-white/[0.08] rounded-2xl p-6 text-center">
                    <div className="animate-pulse text-indigo-300 text-sm">{s.summaryLoading}</div>
                  </div>
                ) : summary ? (
                  <div className="bg-white/[0.06] border border-white/[0.08] rounded-2xl p-4 space-y-3">
                    <h3 className="text-sm font-semibold text-white">{s.summaryTitle}</h3>
                    <p className="text-xs text-indigo-200/80 whitespace-pre-line leading-relaxed">{summary}</p>
                  </div>
                ) : (
                  <div className="bg-white/[0.06] border border-white/[0.08] rounded-2xl p-4">
                    <p className="text-xs text-indigo-300/60">{s.noConsultations}</p>
                  </div>
                )}

                {/* Профиль */}
                {renderProfile()}

                <button
                  onClick={() => setStepK('additions')}
                  className="btn btn-ai w-full py-3 rounded-xl text-sm font-medium"
                >
                  {lang === 'ru' ? 'Далее' : 'Next'}
                </button>
              </>
            )}

            {/* Шаг 2: Дополнение */}
            {stepK === 'additions' && (
              <>
                <div className="bg-white/[0.06] border border-white/[0.08] rounded-2xl p-4 space-y-3">
                  <h3 className="text-sm font-semibold text-white">{s.anythingToAdd}</h3>
                  <textarea
                    value={additions}
                    onChange={e => setAdditions(e.target.value)}
                    placeholder={s.addPlaceholder}
                    rows={4}
                    className="w-full text-sm px-3 py-2 rounded-xl bg-white/[0.06] border border-white/[0.1] text-white placeholder:text-indigo-300/40 resize-none focus:outline-none focus:border-indigo-400"
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleGenerateQuestions('', summary)}
                    disabled={questionsLoading}
                    className="flex-1 btn btn-ai py-3 rounded-xl text-sm font-medium"
                  >
                    {questionsLoading ? s.questionsLoading : s.noGenerateQuestions}
                  </button>
                  {additions.trim() && (
                    <button
                      onClick={() => handleGenerateQuestions(additions, summary)}
                      disabled={questionsLoading}
                      className="flex-1 btn btn-ai py-3 rounded-xl text-sm font-medium"
                    >
                      {questionsLoading ? s.questionsLoading : s.submitAdditions}
                    </button>
                  )}
                </div>
              </>
            )}

            {/* Шаг 3: Вопросы */}
            {stepK === 'questions' && (
              <>
                <h3 className="text-sm font-semibold text-white">{s.questionsTitle}</h3>
                {renderQuestions(questions, answers, false)}

                <button
                  onClick={() => runAnalysis(buildAnswersText(questions, answers))}
                  disabled={loading}
                  className="btn btn-ai w-full py-3 rounded-xl text-sm font-medium"
                >
                  {loading ? s.analyzingAnswers : s.analyzeAnswers}
                </button>
              </>
            )}

            {/* Шаг 4: Анализ в процессе */}
            {stepK === 'analyzing' && (
              <div className="bg-white/[0.06] border border-white/[0.08] rounded-2xl p-8 text-center space-y-3">
                <div className="w-8 h-8 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-sm text-indigo-200">{s.analyzingAnswers}</p>
              </div>
            )}

            {/* Шаг 5: Результат */}
            {stepK === 'result' && result && (
              <>
                <div className="ai-slide-up">
                  <AIResultPanel
                    aiResult={result}
                    lang={lang}
                    onAssignRemedy={handleAssignRemedy}
                    onClarify={handleClarifyFromPanel}
                    clarifyingQuestions={clarifyQuestions}
                  />
                </div>

                {/* Блок уточнений */}
                {needsClarification && (
                  <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 space-y-3">
                    <h3 className="text-sm font-semibold text-amber-300">{s.clarifyTitle}</h3>
                    <p className="text-xs text-amber-200/70">{s.clarifyDesc}</p>
                    <button
                      onClick={handleClarify}
                      disabled={clarifyLoading}
                      className="btn btn-ai w-full py-2.5 rounded-xl text-sm font-medium"
                    >
                      {clarifyLoading ? s.questionsLoading : s.getClarifyQuestions}
                    </button>
                  </div>
                )}
              </>
            )}

            {/* Шаг 6: Уточняющие вопросы */}
            {stepK === 'clarify' && (
              <>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-white">{s.clarifyTitle}</h3>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300">
                    {s.clarifyIteration(clarifyIteration + 1)}
                  </span>
                </div>
                {renderQuestions(clarifyQuestions, clarifyAnswers, true)}

                <button
                  onClick={reanalyze}
                  disabled={loading}
                  className="btn btn-ai w-full py-3 rounded-xl text-sm font-medium"
                >
                  {loading ? s.analyzingAnswers : s.reanalyze}
                </button>
              </>
            )}
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* Режим I: свободный ввод */}
        {/* ═══════════════════════════════════════════════════════════ */}
        {mode === 'I' && (
          <div className="space-y-4 ai-slide-up">

            {/* Шаг 1: Ввод текста */}
            {stepI === 'input' && (
              <>
                <div className="bg-white/[0.06] border border-white/[0.08] rounded-2xl p-4 space-y-3">
                  <h3 className="text-sm font-semibold text-white">{s.describeCase}</h3>
                  <textarea
                    value={freeText}
                    onChange={e => setFreeText(e.target.value)}
                    placeholder={s.describeCasePlaceholder}
                    rows={8}
                    className="w-full text-sm px-3 py-2 rounded-xl bg-white/[0.06] border border-white/[0.1] text-white placeholder:text-indigo-300/40 resize-none focus:outline-none focus:border-indigo-400 leading-relaxed"
                  />
                </div>

                {/* Профиль */}
                {renderProfile()}

                <button
                  onClick={() => handleGenerateQuestions(freeText, '')}
                  disabled={freeText.trim().length < 10 || questionsLoading}
                  className="btn btn-ai w-full py-3 rounded-xl text-sm font-medium disabled:opacity-40"
                >
                  {questionsLoading ? s.questionsLoading : s.noGenerateQuestions}
                </button>
              </>
            )}

            {/* Шаг 2: Вопросы */}
            {stepI === 'questions' && (
              <>
                <h3 className="text-sm font-semibold text-white">{s.questionsTitle}</h3>
                {renderQuestions(questions, answers, false)}

                <button
                  onClick={() => runAnalysis(buildAnswersText(questions, answers))}
                  disabled={loading}
                  className="btn btn-ai w-full py-3 rounded-xl text-sm font-medium"
                >
                  {loading ? s.analyzingAnswers : s.analyzeAnswers}
                </button>
              </>
            )}

            {/* Шаг 3: Анализ */}
            {stepI === 'analyzing' && (
              <div className="bg-white/[0.06] border border-white/[0.08] rounded-2xl p-8 text-center space-y-3">
                <div className="w-8 h-8 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-sm text-indigo-200">{s.analyzingAnswers}</p>
              </div>
            )}

            {/* Шаг 4: Результат */}
            {stepI === 'result' && result && (
              <>
                <div className="ai-slide-up">
                  <AIResultPanel
                    aiResult={result}
                    lang={lang}
                    onAssignRemedy={handleAssignRemedy}
                    onClarify={handleClarifyFromPanel}
                    clarifyingQuestions={clarifyQuestions}
                  />
                </div>

                {needsClarification && (
                  <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 space-y-3">
                    <h3 className="text-sm font-semibold text-amber-300">{s.clarifyTitle}</h3>
                    <p className="text-xs text-amber-200/70">{s.clarifyDesc}</p>
                    <button
                      onClick={handleClarify}
                      disabled={clarifyLoading}
                      className="btn btn-ai w-full py-2.5 rounded-xl text-sm font-medium"
                    >
                      {clarifyLoading ? s.questionsLoading : s.getClarifyQuestions}
                    </button>
                  </div>
                )}
              </>
            )}

            {/* Шаг 5: Уточняющие вопросы */}
            {stepI === 'clarify' && (
              <>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-white">{s.clarifyTitle}</h3>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300">
                    {s.clarifyIteration(clarifyIteration + 1)}
                  </span>
                </div>
                {renderQuestions(clarifyQuestions, clarifyAnswers, true)}

                <button
                  onClick={reanalyze}
                  disabled={loading}
                  className="btn btn-ai w-full py-3 rounded-xl text-sm font-medium"
                >
                  {loading ? s.analyzingAnswers : s.reanalyze}
                </button>
              </>
            )}
          </div>
        )}

        {/* Ошибка */}
        {error && (
          <div className="text-xs text-red-300 bg-red-500/10 rounded-xl px-4 py-3 border border-red-500/20">
            {error}
          </div>
        )}

        {/* Отступ снизу */}
        <div className="h-8" />
      </div>
    </div>
  )
}
