'use client'

import { useState } from 'react'
import type { ConsensusResult, MDRIResult } from '@/lib/mdri/types'
import type { AIQuestion } from '@/lib/actions/ai-consultation'

type Props = {
  aiResult: ConsensusResult
  lang: 'ru' | 'en'
  onAssignRemedy?: (abbrev: string, potency: string) => void
  onClarify?: (questions: AIQuestion[]) => void
  clarifyingQuestions?: AIQuestion[]
}

// Перевод hints
const HINT_RU: Record<string, string> = {
  heat_cold: 'чувствительность к теплу/холоду',
  motion_rest: 'хуже от движения / лучше в покое',
  open_air: 'на свежем воздухе',
  consolation: 'реакция на утешение',
  thirst: 'жажда',
  appetite: 'аппетит',
  sleep: 'сон',
  perspiration: 'потоотделение',
}

function translateHint(hint: string): string {
  let r = hint
  for (const [k, v] of Object.entries(HINT_RU)) r = r.replace(new RegExp(k, 'gi'), v)
  return r
}

// Генерация факторов "почему выбран" из линз
function extractFactors(result: MDRIResult): string[] {
  const f: string[] = []
  for (const l of result.lenses) {
    if (l.name === 'Kent' && l.score >= 50) f.push('высокое совпадение в классическом реперторий')
    if (l.name === 'Constellation' && l.score >= 60) f.push('характерный паттерн полностью совпал')
    else if (l.name === 'Constellation' && l.score >= 30) f.push('частичное совпадение характерных паттернов')
    if (l.name === 'Hierarchy' && l.score >= 60) f.push('совпадение по ключевым уровням симптомов')
    if (l.name === 'Polarity' && l.score >= 50) f.push('подтверждено полярностным анализом')
    if (l.name === 'Negative' && l.score >= 70) f.push('нет противоречащих признаков')
  }
  if (result.miasm) f.push(`миазматическое соответствие: ${result.miasm}`)
  return f.slice(0, 5)
}

// Генерация причин "почему НЕ выбран" — сравнение с top-1
function extractWeaknesses(result: MDRIResult, top: MDRIResult): string[] {
  const w: string[] = []
  for (const topLens of top.lenses) {
    const thisLens = result.lenses.find(l => l.name === topLens.name)
    if (!thisLens) continue
    const gap = topLens.score - thisLens.score
    if (gap < 15) continue

    if (topLens.name === 'Constellation' && thisLens.score < 30) w.push('не подтверждён характерный паттерн')
    else if (topLens.name === 'Hierarchy' && thisLens.score < 40) w.push('слабое совпадение по ключевым уровням')
    else if (topLens.name === 'Kent' && thisLens.score < 40) w.push('меньше совпадений в реперторий')
    else if (topLens.name === 'Polarity' && thisLens.score < 30) w.push('не подтверждён полярностным анализом')
    else if (topLens.name === 'Negative' && thisLens.score < 50) w.push('есть противоречащие признаки')
  }
  if (w.length === 0) w.push('менее выраженное общее совпадение')
  return w.slice(0, 2)
}

// Уверенность текстом
function confidenceText(level: string): string {
  const m: Record<string, string> = {
    high: 'Высокая уверенность', medium: 'Хорошее совпадение',
    low: 'Требует уточнения', insufficient: 'Недостаточно данных',
  }
  return m[level] ?? level
}

function confidenceStyle(level: string): string {
  const m: Record<string, string> = {
    high: 'text-[#2d6a4f] bg-[#2d6a4f]/8', medium: 'text-[#5a7a5c] bg-[#5a7a5c]/8',
    low: 'text-amber-600 bg-amber-50', insufficient: 'text-red-500 bg-red-50',
  }
  return m[level] ?? 'text-gray-500 bg-gray-50'
}

// ═══════════════════════════════════════════
// Блок: Как AI понял случай
// ═══════════════════════════════════════════
function CaseUnderstanding({ profile }: { profile: NonNullable<ConsensusResult['inferredProfile']> }) {
  const LABELS: Record<string, string> = {
    acute: 'Острый', chronic: 'Хронический',
    high: 'Высокая', medium: 'Средняя', low: 'Низкая',
    child: 'Ребёнок', adult: 'Взрослый', elderly: 'Пожилой',
  }
  const confDot = (c: number) =>
    c >= 0.7 ? 'bg-[#2d6a4f]' : c >= 0.4 ? 'bg-[#5a7a5c]' : 'bg-amber-400'
  const confText = (c: number) =>
    c >= 0.7 ? 'высокая' : c >= 0.4 ? 'средняя' : 'низкая'

  const items = [
    { label: 'Тип', value: LABELS[profile.caseType.value] ?? profile.caseType.value, conf: profile.caseType.confidence },
    { label: 'Витальность', value: LABELS[profile.vitality.value] ?? profile.vitality.value, conf: profile.vitality.confidence },
    { label: 'Чувствительность', value: LABELS[profile.sensitivity.value] ?? profile.sensitivity.value, conf: profile.sensitivity.confidence },
    { label: 'Возраст', value: LABELS[profile.age.value] ?? profile.age.value, conf: profile.age.confidence },
  ]

  const hasLowConf = items.some(i => i.conf < 0.4)

  return (
    <div className="px-4 py-3">
      <div className="text-[10px] font-semibold text-[#9a8a6a] uppercase tracking-[0.08em] mb-2">
        Как AI понял случай
      </div>
      <div className="grid grid-cols-2 gap-x-6 gap-y-1.5">
        {items.map(item => (
          <div key={item.label} className="flex items-center gap-1.5">
            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${confDot(item.conf)}`} />
            <span className="text-[11px] text-[#9a8a6a]">{item.label}</span>
            <span className="text-[11px] font-medium text-[#3a3020]">{item.value}</span>
            {item.conf < 0.4 && (
              <span className="text-[9px] text-amber-500">?</span>
            )}
          </div>
        ))}
      </div>
      {hasLowConf && (
        <p className="text-[10px] text-amber-500 mt-2 flex items-center gap-1">
          <svg className="w-3 h-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126z" />
          </svg>
          Параметры с низкой уверенностью — уточните описание случая
        </p>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════
// Блок: Главный препарат (TOP-1)
// ═══════════════════════════════════════════
function HeroRemedy({ result, onAssign, onCompare }: {
  result: MDRIResult
  onAssign?: () => void
  onCompare: () => void
}) {
  const factors = extractFactors(result)

  return (
    <div className="ai-fade-in px-4 py-4">
      {/* Название — крупно, как единственный фокус */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="text-2xl font-bold text-[#1a1a0a] tracking-tight uppercase leading-none">
            {result.remedy}
          </div>
          <div className="text-[13px] text-[#9a8a6a] mt-0.5">{result.remedyName}</div>
        </div>
        <span className={`text-[11px] px-2.5 py-1 rounded-full font-medium ${confidenceStyle(result.confidence)}`}>
          {confidenceText(result.confidence)}
        </span>
      </div>

      {/* Факторы */}
      {factors.length > 0 && (
        <div className="mb-4">
          <div className="text-[10px] font-semibold text-[#9a8a6a] uppercase tracking-[0.08em] mb-1.5">
            Выбран на основе
          </div>
          <div className="space-y-1">
            {factors.map((f, i) => (
              <div key={i} className="flex items-start gap-2 text-[12px] text-[#3a3020]">
                <span className="w-1 h-1 rounded-full bg-[#2d6a4f] mt-1.5 shrink-0" />
                <span>{f}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Потенция */}
      {result.potency && (
        <div className="flex items-center gap-2 text-[12px] mb-4 px-3 py-2 rounded-xl bg-[#f8f5f0] border border-[rgba(0,0,0,0.06)]">
          <span className="text-[#9a8a6a]">Потенция:</span>
          <span className="font-semibold text-[#3a3020]">{result.potency.potency}</span>
          <span className="text-[#9a8a6a]">—</span>
          <span className="text-[#6a5a4a]">{result.potency.reasoning}</span>
        </div>
      )}

      {/* Кнопки */}
      <div className="flex gap-2">
        {onAssign && (
          <button
            onClick={onAssign}
            className="flex-1 text-[13px] font-semibold py-2.5 rounded-2xl bg-[#2d6a4f] text-white hover:bg-[#245a42] active:scale-[0.98] transition-all shadow-sm"
          >
            Назначить {result.remedy.toUpperCase()} {result.potency?.potency ?? '30C'}
          </button>
        )}
        <button
          onClick={onCompare}
          className="px-4 text-[12px] font-medium py-2.5 rounded-2xl border border-[rgba(0,0,0,0.1)] text-[#6a5a4a] hover:bg-[#f8f5f0] active:scale-[0.98] transition-all"
        >
          Сравнить
        </button>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════
// Блок: Альтернативы ("почему не другие")
// ═══════════════════════════════════════════
function AlternativesBlock({ alternatives, top, onAssign }: {
  alternatives: MDRIResult[]
  top: MDRIResult
  onAssign?: (abbrev: string, potency: string) => void
}) {
  if (alternatives.length === 0) return null

  return (
    <div className="px-4 py-3">
      <div className="text-[10px] font-semibold text-[#9a8a6a] uppercase tracking-[0.08em] mb-2">
        Альтернативы
      </div>
      <div className="space-y-2">
        {alternatives.slice(0, 3).map((alt, idx) => {
          const weaknesses = extractWeaknesses(alt, top)
          return (
            <div
              key={alt.remedy}
              className="ai-fade-in flex items-start gap-3 p-2.5 rounded-xl border border-[rgba(0,0,0,0.06)] bg-white/60 hover:bg-[#f8f5f0] transition-colors group"
              style={{ animationDelay: `${(idx + 1) * 0.08}s` }}
            >
              <span className="w-5 h-5 rounded-full bg-[#e8e2d8] flex items-center justify-center text-[10px] font-bold text-[#9a8a6a] shrink-0 mt-0.5">
                {idx + 2}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-[13px] font-bold text-[#3a3020] uppercase">{alt.remedy}</span>
                  <span className="text-[11px] text-[#9a8a6a] truncate">{alt.remedyName}</span>
                </div>
                <div className="mt-0.5 space-y-0.5">
                  {weaknesses.map((w, i) => (
                    <div key={i} className="text-[11px] text-[#9a8a6a] flex items-start gap-1">
                      <span className="text-amber-400 shrink-0 mt-px">—</span>
                      <span>{w}</span>
                    </div>
                  ))}
                </div>
              </div>
              {onAssign && (
                <button
                  onClick={() => onAssign(alt.remedy, alt.potency?.potency ?? '30C')}
                  className="opacity-0 group-hover:opacity-100 text-[10px] px-2.5 py-1 rounded-lg border border-[rgba(0,0,0,0.1)] text-[#6a5a4a] hover:bg-[#f0ebe3] transition-all shrink-0 mt-0.5"
                >
                  Назначить
                </button>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════
// Блок: Детальное сравнение (раскрывается)
// ═══════════════════════════════════════════
function DetailedComparison({ results, onAssign }: {
  results: MDRIResult[]
  onAssign?: (abbrev: string, potency: string) => void
}) {
  const [expanded, setExpanded] = useState<number | null>(null)

  const lensLabel = (name: string) => {
    const m: Record<string, string> = {
      Kent: 'Реперторий', Constellation: 'Паттерны', Hierarchy: 'Иерархия',
      Polarity: 'Полярности', Negative: 'Исключения', Miasm: 'Миазм',
    }
    return m[name] ?? name
  }
  const lensLevel = (s: number) => s >= 70 ? 'сильное' : s >= 50 ? 'среднее' : s >= 30 ? 'слабое' : '—'
  const barColor = (s: number) => s >= 70 ? 'bg-[#2d6a4f]' : s >= 50 ? 'bg-[#5a7a5c]' : s >= 30 ? 'bg-[#9a8a6a]' : 'bg-gray-200'

  return (
    <div className="px-4 py-3 border-t border-[rgba(0,0,0,0.06)]">
      <div className="text-[10px] font-semibold text-[#9a8a6a] uppercase tracking-[0.08em] mb-2">
        Детальное сравнение
      </div>
      <div className="space-y-1">
        {results.slice(0, 5).map((r, idx) => (
          <div key={r.remedy}>
            <button
              onClick={() => setExpanded(expanded === idx ? null : idx)}
              className="w-full flex items-center gap-2 py-1.5 px-2 rounded-lg hover:bg-[#f8f5f0] transition-colors text-left"
            >
              <span className="text-[12px] font-bold text-[#3a3020] uppercase w-14">{r.remedy}</span>
              <div className="flex-1 h-1 bg-gray-100 rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all ${barColor(r.totalScore)}`} style={{ width: `${r.totalScore}%` }} />
              </div>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${confidenceStyle(r.confidence)}`}>
                {confidenceText(r.confidence)}
              </span>
              <svg className={`w-3 h-3 text-[#9a8a6a] transition-transform ${expanded === idx ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {expanded === idx && (
              <div className="ml-16 mr-2 mb-2 space-y-1">
                {r.lenses.map(l => (
                  <div key={l.name} className="flex items-center gap-2 text-[11px]">
                    <span className="text-[#9a8a6a] w-20 shrink-0">{lensLabel(l.name)}</span>
                    <div className="flex-1 h-1 bg-gray-100 rounded-full overflow-hidden">
                      <div className={`ai-lens-bar h-full rounded-full ${barColor(l.score)}`} style={{ width: `${l.score}%` }} />
                    </div>
                    <span className="text-[10px] text-[#9a8a6a] w-14 text-right">{lensLevel(l.score)}</span>
                  </div>
                ))}
                {r.miasm && <div className="text-[11px] text-[#6a5a4a]">Миазм: {r.miasm}</div>}
                {r.potency && <div className="text-[11px] text-[#6a5a4a]">Потенция: {r.potency.potency} — {r.potency.reasoning}</div>}
                {onAssign && (
                  <button
                    onClick={() => onAssign(r.remedy, r.potency?.potency ?? '30C')}
                    className="text-[11px] font-medium px-3 py-1.5 rounded-lg bg-[#2d6a4f] text-white hover:bg-[#245a42] transition-colors mt-1"
                  >
                    Назначить {r.remedy.toUpperCase()} {r.potency?.potency ?? '30C'}
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════
// Блок: Требует уточнения
// ═══════════════════════════════════════════
function ClarifyBlock({ aiResult, onClarify, clarifyingQuestions }: {
  aiResult: ConsensusResult
  onClarify: (q: AIQuestion[]) => void
  clarifyingQuestions?: AIQuestion[]
}) {
  const pc = aiResult.productConfidence
  const results = aiResult.mdriResults
  const needsClarify = pc
    ? (pc.level === 'clarify' || pc.level === 'insufficient')
    : (() => {
      const top = results[0]
      const second = results[1]
      return top && (top.confidence === 'low' || top.confidence === 'insufficient' || (second && top.totalScore - second.totalScore < 5))
    })()

  if (!needsClarify) return null

  // Собираем что именно нужно уточнить
  const needsItems: string[] = []
  const w = aiResult.warnings ?? []
  if (w.some(x => x.type === 'no_modalities')) needsItems.push('модальности (что ухудшает/улучшает)')
  if (w.some(x => x.type === 'no_mental')) needsItems.push('психическое состояние')
  if (w.some(x => x.type === 'no_general')) needsItems.push('общие симптомы')
  if (w.some(x => x.type === 'few_symptoms')) needsItems.push('больше деталей о жалобах')
  if (needsItems.length === 0) needsItems.push('дополнительные детали случая')

  return (
    <div className="mx-4 mb-3 p-3 rounded-2xl bg-amber-50/80 border border-amber-200/60">
      <div className="flex items-start gap-2">
        <svg className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126z" />
        </svg>
        <div className="flex-1">
          <div className="text-[12px] font-semibold text-amber-700 mb-1">Требует уточнения</div>
          <div className="space-y-0.5 mb-2">
            {needsItems.map((item, i) => (
              <div key={i} className="text-[11px] text-amber-600 flex items-start gap-1">
                <span className="text-amber-400 shrink-0">·</span>
                <span>{item}</span>
              </div>
            ))}
          </div>
          <button
            onClick={() => onClarify(clarifyingQuestions ?? [])}
            className="text-[11px] font-medium px-4 py-1.5 rounded-xl bg-amber-100 text-amber-700 hover:bg-amber-200 transition-colors border border-amber-200/60"
          >
            Уточнить данные
          </button>
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════
// Главный компонент
// ═══════════════════════════════════════════
export default function AIResultPanel({ aiResult, lang, onAssignRemedy, onClarify, clarifyingQuestions }: Props) {
  const [showComparison, setShowComparison] = useState(false)

  const results = aiResult.mdriResults
  const top = results[0]
  const alternatives = results.slice(1, 4)

  if (!top) return null

  return (
    <div className="ai-slide-up rounded-2xl bg-[#faf7f2] border border-[rgba(0,0,0,0.08)] overflow-hidden shadow-sm">
      {/* Верхняя полоска — confidence */}
      <div className="px-4 py-2 border-b border-[rgba(0,0,0,0.06)] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-[#2d6a4f] animate-pulse" />
          <span className="text-[11px] font-semibold text-[#3a3020]">AI-анализ завершён</span>
        </div>
        {aiResult.productConfidence && (
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${confidenceStyle(aiResult.productConfidence.level === 'high' ? 'high' : aiResult.productConfidence.level === 'good' ? 'medium' : aiResult.productConfidence.level === 'clarify' ? 'low' : 'insufficient')}`}>
            {aiResult.productConfidence.label}
          </span>
        )}
      </div>

      {/* Warnings — компактно */}
      {aiResult.warnings && aiResult.warnings.length > 0 && (
        <div className="px-4 py-2 border-b border-[rgba(0,0,0,0.04)] bg-amber-50/40">
          {aiResult.warnings.slice(0, 2).map((w, i) => (
            <p key={i} className="text-[10px] text-amber-600">
              {w.message} — <span className="text-amber-500">{translateHint(w.hint)}</span>
            </p>
          ))}
        </div>
      )}

      {/* Как AI понял случай */}
      {aiResult.inferredProfile && (
        <div className="border-b border-[rgba(0,0,0,0.06)]">
          <CaseUnderstanding profile={aiResult.inferredProfile} />
        </div>
      )}

      {/* ★ ГЛАВНЫЙ ПРЕПАРАТ */}
      <div className="border-b border-[rgba(0,0,0,0.06)]">
        <HeroRemedy
          result={top}
          onAssign={onAssignRemedy ? () => onAssignRemedy(top.remedy, top.potency?.potency ?? '30C') : undefined}
          onCompare={() => setShowComparison(!showComparison)}
        />
      </div>

      {/* Альтернативы — всегда видны */}
      <AlternativesBlock
        alternatives={alternatives}
        top={top}
        onAssign={onAssignRemedy}
      />

      {/* Детальное сравнение — по нажатию "Сравнить" */}
      {showComparison && (
        <DetailedComparison results={results} onAssign={onAssignRemedy} />
      )}

      {/* Уточнение — если нужно */}
      {onClarify && (
        <ClarifyBlock
          aiResult={aiResult}
          onClarify={onClarify}
          clarifyingQuestions={clarifyingQuestions}
        />
      )}
    </div>
  )
}
