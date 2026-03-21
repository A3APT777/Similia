'use client'

import { useState } from 'react'
import { Consultation, Followup } from '@/types'
import PatientTimeline from './PatientTimeline'
import { t } from '@/lib/i18n'
import { useLanguage } from '@/hooks/useLanguage'

const INITIAL_LIMIT = 20

type Props = {
  patientId: string
  consultations: Consultation[]
  followupByConsultation: Record<string, Followup>
}

export default function TimelineWithFilter({ patientId, consultations, followupByConsultation }: Props) {
  const { lang } = useLanguage()
  const [remedy, setRemedy] = useState('')
  const [typeFilter, setTypeFilter] = useState<'all' | 'chronic' | 'acute'>('all')
  const [limit, setLimit] = useState(INITIAL_LIMIT)

  const byType = typeFilter === 'all'
    ? consultations
    : consultations.filter(c => c.type === typeFilter)

  const filtered = remedy.trim()
    ? byType.filter(c =>
        c.remedy?.toLowerCase().includes(remedy.toLowerCase()) ||
        c.notes?.toLowerCase().includes(remedy.toLowerCase())
      )
    : byType

  const hasAcute = consultations.some(c => c.type === 'acute')
  const hasChronic = consultations.some(c => c.type === 'chronic')

  // При поиске показываем все результаты, при просмотре — с пагинацией
  const visible = remedy.trim() ? filtered : filtered.slice(0, limit)
  const hasMore = !remedy.trim() && filtered.length > limit

  const allRemedies = [...new Set(
    consultations
      .map(c => c.remedy)
      .filter(Boolean) as string[]
  )].sort()

  return (
    <div>
      {/* Фильтр по типу */}
      {hasAcute && hasChronic && (
        <div className="flex gap-1.5 mb-3">
          {([
            { value: 'all' as const, label: lang === 'ru' ? 'Все' : 'All' },
            { value: 'chronic' as const, label: lang === 'ru' ? 'Хронические' : 'Chronic' },
            { value: 'acute' as const, label: lang === 'ru' ? 'Острые' : 'Acute' },
          ]).map(opt => (
            <button
              key={opt.value}
              onClick={() => { setTypeFilter(opt.value); setLimit(INITIAL_LIMIT) }}
              className="text-[12px] px-3 py-1 rounded-lg border transition-all"
              style={{
                borderColor: typeFilter === opt.value ? '#2d6a4f' : '#d4c9b8',
                backgroundColor: typeFilter === opt.value ? '#2d6a4f' : 'transparent',
                color: typeFilter === opt.value ? '#fff' : '#9a8a6a',
                fontWeight: typeFilter === opt.value ? 600 : 400,
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}

      {/* Фильтр по препарату */}
      {allRemedies.length > 0 && (
        <div className="mb-5">
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-300 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
            <input
              type="text"
              value={remedy}
              onChange={e => {
                setRemedy(e.target.value)
                setLimit(INITIAL_LIMIT) // сбрасываем пагинацию при новом поиске
              }}
              placeholder={t(lang).timelineFilter.search}
              className="w-full pl-8 pr-8 py-2 text-sm border border-[#d4c9b8] rounded-xl focus:outline-none focus:border-emerald-400 focus:ring-4 focus:ring-[#2d6a4f]/30/10 transition-all"
              style={{ backgroundColor: '#faf7f2' }}
            />
            {remedy && (
              <button
                onClick={() => setRemedy('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-600 transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          {/* Быстрые теги препаратов */}
          {!remedy && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {allRemedies.map(r => (
                <button
                  key={r}
                  onClick={() => setRemedy(r)}
                  className="text-xs px-2.5 py-1 rounded-lg border border-gray-200 text-gray-500 hover:border-emerald-300 hover:text-emerald-700 hover:bg-emerald-50 transition-all"
                >
                  {r}
                </button>
              ))}
            </div>
          )}

          {remedy && filtered.length === 0 && (
            <p className="text-xs text-gray-400 mt-2 px-1">{t(lang).timelineFilter.nothingFound(remedy)}</p>
          )}
          {remedy && filtered.length > 0 && (
            <p className="text-xs text-gray-400 mt-2 px-1">
              {t(lang).timelineFilter.found(filtered.length)}
            </p>
          )}
        </div>
      )}

      <PatientTimeline
        patientId={patientId}
        consultations={visible}
        followupByConsultation={followupByConsultation}
      />

      {/* Кнопка «Загрузить ещё» */}
      {hasMore && (
        <div className="mt-6 text-center">
          <button
            onClick={() => setLimit(l => l + INITIAL_LIMIT)}
            className="text-sm text-gray-400 hover:text-emerald-700 border border-gray-200 hover:border-emerald-300 hover:bg-emerald-50 px-5 py-2.5 rounded-xl transition-all"
          >
            {t(lang).timelineFilter.showMore(filtered.length - limit)}
          </button>
        </div>
      )}

      {/* Заглушка когда всё показано и консультаций много */}
      {!hasMore && filtered.length > INITIAL_LIMIT && !remedy && (
        <p className="mt-4 text-center text-xs text-gray-300">
          {t(lang).timelineFilter.allLoaded(filtered.length)}
        </p>
      )}
    </div>
  )
}
