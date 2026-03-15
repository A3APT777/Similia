'use client'

import { useMemo } from 'react'
import { compareConsultations } from '@/lib/compareConsultations'

type Props = {
  currentNotes: string
  previousNotes: string
}

export default function ComparisonPanel({ currentNotes, previousNotes }: Props) {
  const result = useMemo(
    () => compareConsultations(currentNotes, previousNotes),
    [currentNotes, previousNotes]
  )

  const hasAnything =
    result.newItems.length > 0 ||
    result.goneItems.length > 0 ||
    result.sameItems.length > 0

  if (!currentNotes.trim()) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-16 text-center px-6">
        <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center mb-3">
          <svg className="w-5 h-5 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
          </svg>
        </div>
        <p className="text-sm text-gray-400">Начните писать заметки</p>
        <p className="text-xs text-gray-300 mt-1">Сравнение появится автоматически</p>
      </div>
    )
  }

  if (!hasAnything) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-16 text-center px-6">
        <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center mb-3">
          <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <p className="text-sm text-gray-400">Симптомы не распознаны</p>
        <p className="text-xs text-gray-300 mt-1">Попробуйте писать по одному симптому на строку</p>
      </div>
    )
  }

  const total = result.newItems.length + result.goneItems.length + result.sameItems.length

  return (
    <div className="px-6 py-5 space-y-5 overflow-y-auto">
      {/* Сводка */}
      <div className="flex items-center gap-3">
        {result.newItems.length > 0 && (
          <div className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span className="text-xs font-semibold text-emerald-700">{result.newItems.length} новых</span>
          </div>
        )}
        {result.goneItems.length > 0 && (
          <div className="flex items-center gap-1.5 bg-red-50 border border-red-100 rounded-xl px-3 py-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
            <span className="text-xs font-semibold text-red-600">{result.goneItems.length} прошли</span>
          </div>
        )}
        {result.sameItems.length > 0 && (
          <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-xl px-3 py-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
            <span className="text-xs font-semibold text-gray-500">{result.sameItems.length} без изм.</span>
          </div>
        )}
      </div>

      {/* Новые симптомы */}
      {result.newItems.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-1 h-4 rounded-full bg-emerald-400" />
            <h3 className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">
              Новые симптомы
            </h3>
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
      )}

      {/* Исчезнувшие симптомы */}
      {result.goneItems.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-1 h-4 rounded-full bg-red-400" />
            <h3 className="text-xs font-semibold text-red-600 uppercase tracking-wider">
              Исчезли / прошли
            </h3>
          </div>
          <div className="space-y-1.5">
            {result.goneItems.map((item, i) => (
              <div
                key={i}
                className="flex items-start gap-2.5 bg-red-50 border border-red-100 rounded-xl px-3.5 py-2.5"
              >
                <svg className="w-3.5 h-3.5 text-red-400 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" />
                </svg>
                <span className="text-sm text-red-700 leading-snug line-through decoration-red-300">{item}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Без изменений */}
      {result.sameItems.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-1 h-4 rounded-full bg-gray-300" />
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Без изменений
            </h3>
          </div>
          <div className="space-y-1.5">
            {result.sameItems.map((item, i) => (
              <div
                key={i}
                className="flex items-start gap-2.5 bg-white border border-gray-100 rounded-xl px-3.5 py-2.5"
              >
                <svg className="w-3.5 h-3.5 text-gray-300 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 8.25L21 12m0 0l-3.75 3.75M21 12H3" />
                </svg>
                <div className="min-w-0">
                  <span className="text-sm text-gray-600 leading-snug">{item.current}</span>
                  {item.changed && (
                    <p className="text-[10px] text-gray-400 mt-0.5 italic">
                      Было: {item.previous}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Подсказка */}
      <p className="text-[10px] text-gray-300 text-center pt-2 border-t border-gray-50">
        Всего {total} наблюдений · Сравнение обновляется автоматически
      </p>
    </div>
  )
}
