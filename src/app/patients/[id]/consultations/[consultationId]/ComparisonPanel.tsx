'use client'

import { useMemo } from 'react'
import { compareConsultations, ComparisonResult } from '@/lib/compareConsultations'
import { t } from '@/lib/i18n'
import { useLanguage } from '@/hooks/useLanguage'

type FieldData = {
  complaints: string
  observations: string
  notes: string
  recommendations: string
}

type Props = {
  current: FieldData
  previous: FieldData
}

// Иконки для каждой секции
const SECTION_ICONS: Record<string, string> = {
  complaints: '\u{1F4CB}',
  observations: '\u{1F50D}',
  notes: '\u{1F4DD}',
  recommendations: '\u{1F48A}',
}

// Ключи секций в порядке отображения
const SECTION_KEYS = ['complaints', 'observations', 'notes', 'recommendations'] as const
type SectionKey = typeof SECTION_KEYS[number]

export default function ComparisonPanel({ current, previous }: Props) {
  const { lang } = useLanguage()

  // Считаем diff для каждой секции
  const sections = useMemo(() => {
    return SECTION_KEYS.map(key => ({
      key,
      current: current[key],
      previous: previous[key],
      result: compareConsultations(current[key], previous[key]),
    }))
  }, [current, previous])

  // Проверяем, есть ли хоть что-то для показа
  const allCurrentEmpty = SECTION_KEYS.every(k => !current[k].trim())

  if (allCurrentEmpty) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-16 text-center px-6">
        <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center mb-3">
          <svg className="w-5 h-5 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
          </svg>
        </div>
        <p className="text-sm text-gray-400">{t(lang).comparison.startWriting}</p>
        <p className="text-xs text-gray-300 mt-1">{t(lang).comparison.willAppear}</p>
      </div>
    )
  }

  // Подсчёт общей статистики по всем секциям
  let totalNew = 0, totalGone = 0, totalSame = 0
  for (const s of sections) {
    totalNew += s.result.newItems.length
    totalGone += s.result.goneItems.length
    totalSame += s.result.sameItems.length
  }
  const total = totalNew + totalGone + totalSame

  return (
    <div className="px-6 py-5 space-y-5 overflow-y-auto">
      {/* Сводка */}
      <div className="flex items-center gap-3">
        {totalNew > 0 && (
          <div className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span className="text-xs font-semibold text-emerald-700">{totalNew} {t(lang).comparison.newCount}</span>
          </div>
        )}
        {totalGone > 0 && (
          <div className="flex items-center gap-1.5 bg-red-50 border border-red-100 rounded-xl px-3 py-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
            <span className="text-xs font-semibold text-red-600">{totalGone} {t(lang).comparison.resolvedCount}</span>
          </div>
        )}
        {totalSame > 0 && (
          <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-xl px-3 py-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
            <span className="text-xs font-semibold text-gray-500">{totalSame} {t(lang).comparison.unchangedCount}</span>
          </div>
        )}
      </div>

      {/* Секции по полям */}
      {sections.map(({ key, current: cur, previous: prev, result }) => (
        <SectionDiff
          key={key}
          sectionKey={key}
          currentText={cur}
          previousText={prev}
          result={result}
          lang={lang}
        />
      ))}

      {/* Подсказка */}
      {total > 0 && (
        <p className="text-[10px] text-gray-300 text-center pt-2 border-t border-gray-50">
          {t(lang).comparison.totalObservations(total)}
        </p>
      )}
    </div>
  )
}

// Компонент одной секции сравнения
function SectionDiff({
  sectionKey,
  currentText,
  previousText,
  result,
  lang,
}: {
  sectionKey: SectionKey
  currentText: string
  previousText: string
  result: ComparisonResult
  lang: 'ru' | 'en'
}) {
  const hasCurrent = !!currentText.trim()
  const hasPrevious = !!previousText.trim()

  // Если обе пустые — пропускаем секцию
  if (!hasCurrent && !hasPrevious) return null

  const icon = SECTION_ICONS[sectionKey]

  // Получаем локализованное название секции
  const sectionLabel = (() => {
    const labels = t(lang).comparison
    switch (sectionKey) {
      case 'complaints': return labels.complaints
      case 'observations': return labels.observations
      case 'notes': return labels.notes
      case 'recommendations': return labels.recommendations
    }
  })()

  // Если предыдущая пустая, а текущая нет — всё новое
  if (!hasPrevious && hasCurrent) {
    return (
      <section>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-sm">{icon}</span>
          <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
            {sectionLabel}
          </h3>
          <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 border border-emerald-100 rounded-full px-2 py-0.5">
            {t(lang).comparison.newSection}
          </span>
        </div>
        <div className="space-y-1.5">
          {result.newItems.map((item, i) => (
            <div
              key={i}
              className="flex items-start gap-2.5 bg-emerald-50 border border-emerald-100 rounded-xl px-3.5 py-2.5"
            >
              <svg className="w-3.5 h-3.5 text-emerald-500 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              <span className="text-sm text-emerald-800 leading-snug">{item}</span>
            </div>
          ))}
        </div>
      </section>
    )
  }

  // Если текущая пустая, а предыдущая нет — показываем прочерк
  if (hasPrevious && !hasCurrent) {
    return (
      <section>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-sm">{icon}</span>
          <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
            {sectionLabel}
          </h3>
        </div>
        <div className="text-sm text-gray-300 italic px-3.5 py-2">
          {t(lang).comparison.noData}
        </div>
      </section>
    )
  }

  // Обе заполнены — показываем полный diff
  const hasAnything =
    result.newItems.length > 0 ||
    result.goneItems.length > 0 ||
    result.sameItems.length > 0

  // Если diff не распознал ничего — пропускаем (для заметок например)
  if (!hasAnything) return null

  return (
    <section>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-sm">{icon}</span>
        <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
          {sectionLabel}
        </h3>
      </div>
      <div className="space-y-1.5">
        {/* Новые */}
        {result.newItems.map((item, i) => (
          <div
            key={`new-${i}`}
            className="flex items-start gap-2.5 bg-emerald-50 border border-emerald-100 rounded-xl px-3.5 py-2.5"
          >
            <svg className="w-3.5 h-3.5 text-emerald-500 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            <span className="text-sm text-emerald-800 leading-snug">{item}</span>
          </div>
        ))}

        {/* Исчезнувшие */}
        {result.goneItems.map((item, i) => (
          <div
            key={`gone-${i}`}
            className="flex items-start gap-2.5 bg-red-50 border border-red-100 rounded-xl px-3.5 py-2.5"
          >
            <svg className="w-3.5 h-3.5 text-red-400 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" />
            </svg>
            <span className="text-sm text-red-700 leading-snug line-through decoration-red-300">{item}</span>
          </div>
        ))}

        {/* Без изменений */}
        {result.sameItems.map((item, i) => (
          <div
            key={`same-${i}`}
            className="flex items-start gap-2.5 bg-[#ede7dd] border border-gray-100 rounded-xl px-3.5 py-2.5"
          >
            <svg className="w-3.5 h-3.5 text-gray-300 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 8.25L21 12m0 0l-3.75 3.75M21 12H3" />
            </svg>
            <div className="min-w-0">
              <span className="text-sm text-gray-600 leading-snug">{item.current}</span>
              {item.changed && (
                <p className="text-[10px] text-gray-400 mt-0.5 italic">
                  {t(lang).comparison.was} {item.previous}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
