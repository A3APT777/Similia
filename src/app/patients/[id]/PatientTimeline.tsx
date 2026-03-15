import Link from 'next/link'
import { Consultation, Followup } from '@/types'
import { preview } from '@/lib/utils'

// ─── Типы событий на таймлайне ───────────────────────────────────────────────

type ConsultationEvent = {
  kind: 'consultation'
  sortKey: number        // timestamp для сортировки
  consultation: Consultation
  index: number          // порядковый номер (1, 2, 3...)
  followup: Followup | null
}

type FollowupEvent = {
  kind: 'followup'
  sortKey: number
  followup: Followup
  consultation: Consultation
}

type TimelineEvent = ConsultationEvent | FollowupEvent

// ─── Вспомогательные функции ──────────────────────────────────────────────────

// Дата консультации → timestamp для сортировки
function consultationSortKey(c: Consultation): number {
  if (c.scheduled_at) return new Date(c.scheduled_at).getTime()
  return new Date(c.date + 'T12:00:00').getTime()
}

// Форматировать дату/время по Москве
function formatMsk(iso: string, includeTime = false): string {
  const opts: Intl.DateTimeFormatOptions = {
    timeZone: 'Europe/Moscow',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }
  if (includeTime) {
    opts.hour = '2-digit'
    opts.minute = '2-digit'
  }
  return new Date(iso).toLocaleDateString('ru-RU', opts)
}

// Дата из YYYY-MM-DD строки (без timezone сдвига)
function formatLocalDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d, 12)).toLocaleDateString('ru-RU', {
    timeZone: 'UTC',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

// Сколько дней назад
function daysAgo(timestamp: number): string {
  const diff = Math.floor((Date.now() - timestamp) / 86400000)
  if (diff === 0) return 'сегодня'
  if (diff === 1) return 'вчера'
  if (diff < 7) return `${diff} дн. назад`
  if (diff < 30) return `${Math.floor(diff / 7)} нед. назад`
  if (diff < 365) return `${Math.floor(diff / 30)} мес. назад`
  return `${Math.floor(diff / 365)} г. назад`
}

// ─── Конфигурация статусов follow-up ─────────────────────────────────────────

const followupConfig = {
  better: {
    label: 'Лучше',
    dot: 'bg-emerald-500',
    badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    icon: (
      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 10.5L12 3m0 0l7.5 7.5M12 3v18" />
      </svg>
    ),
  },
  same: {
    label: 'Без изменений',
    dot: 'bg-gray-400',
    badge: 'bg-gray-50 text-gray-600 border-gray-200',
    icon: (
      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 12H3m14 0l-4-4m4 4l-4 4" />
      </svg>
    ),
  },
  worse: {
    label: 'Хуже',
    dot: 'bg-red-500',
    badge: 'bg-red-50 text-red-600 border-red-200',
    icon: (
      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 13.5L12 21m0 0l-7.5-7.5M12 21V3" />
      </svg>
    ),
  },
  new_symptoms: {
    label: 'Новые симптомы',
    dot: 'bg-orange-400',
    badge: 'bg-orange-50 text-orange-700 border-orange-200',
    icon: (
      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126z" />
      </svg>
    ),
  },
}

// ─── Карточка консультации ────────────────────────────────────────────────────

function ConsultationCard({
  event,
  patientId,
  isLast,
}: {
  event: ConsultationEvent
  patientId: string
  isLast: boolean
}) {
  const { consultation, index, followup } = event
  const isScheduled = consultation.status === 'scheduled'
  const isInProgress = consultation.status === 'in_progress'
  const isCancelled = consultation.status === 'cancelled'
  const isCompleted = consultation.status === 'completed'
  const isAcute = consultation.type === 'acute'

  const dateStr = consultation.scheduled_at
    ? formatMsk(consultation.scheduled_at, isScheduled)
    : formatLocalDate(consultation.date)

  const title = isAcute
    ? 'Острый случай'
    : index === 1
    ? 'Первая консультация'
    : `Консультация №${index}`

  const dotColor = isCancelled
    ? 'bg-gray-300 border-gray-200'
    : isScheduled
    ? `bg-white ${isAcute ? 'border-orange-300' : 'border-emerald-300'}`
    : isInProgress
    ? 'bg-amber-400 border-amber-300'
    : isAcute
    ? 'bg-orange-400 border-orange-300'
    : 'bg-emerald-500 border-emerald-400'

  return (
    <div className={`relative flex gap-5 pb-8 ${isLast && !followup ? 'pb-0' : ''} ${isCancelled ? 'opacity-50' : ''}`}>

      {/* Вертикальная линия + точка */}
      <div className="flex flex-col items-center shrink-0 w-8">
        <div className={`w-3.5 h-3.5 rounded-full border-2 z-10 mt-1 shrink-0 ${dotColor} ${isScheduled ? 'ring-2 ring-emerald-100' : ''}`} />
        {(!isLast || !!followup) && (
          <div className="flex-1 w-px bg-gray-100 mt-1.5" />
        )}
      </div>

      {/* Карточка */}
      <div className="flex-1 min-w-0 pb-1">
        {/* Дата + тег относительного времени */}
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          <span className="text-xs text-gray-400 font-medium">{dateStr}</span>
          {!isScheduled && !isCancelled && (
            <span className="text-[10px] text-gray-300">{daysAgo(event.sortKey)}</span>
          )}
          {isAcute && !isCancelled && (
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-orange-50 text-orange-600 border border-orange-200">
              ⚡ Острый
            </span>
          )}
          {isScheduled && (
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
              isAcute
                ? 'bg-orange-50 text-orange-700 border-orange-200'
                : 'bg-emerald-50 text-emerald-700 border-emerald-200'
            }`}>
              Предстоит
            </span>
          )}
          {isInProgress && (
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
              Идёт
            </span>
          )}
          {isCancelled && (
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-400">
              Отменён
            </span>
          )}
        </div>

        <Link
          href={`/patients/${patientId}/consultations/${consultation.id}`}
          className={`group block bg-white border rounded-2xl px-4 py-3.5 hover:shadow-sm transition-all ${
            isAcute
              ? 'border-orange-100 hover:border-orange-300 border-l-2 border-l-orange-400'
              : 'border-gray-100 hover:border-emerald-200'
          }`}
        >
          <p className={`text-sm font-semibold mb-1.5 transition-colors ${
            isAcute
              ? 'text-orange-700 group-hover:text-orange-800'
              : 'text-gray-800 group-hover:text-emerald-700'
          }`}>
            {title}
          </p>

          {isScheduled ? (
            <p className="text-sm text-gray-400 italic">Запланированный приём</p>
          ) : isCompleted && consultation.notes ? (
            <p className="text-sm text-gray-500 leading-relaxed">
              {preview(consultation.notes, 140)}
            </p>
          ) : isCompleted && !consultation.notes ? (
            <p className="text-sm text-gray-300 italic">Без заметок</p>
          ) : isInProgress ? (
            <p className="text-sm text-gray-400 italic">Приём идёт...</p>
          ) : null}

          {/* Назначение */}
          {isCompleted && consultation.remedy ? (
            <div className="mt-2 inline-flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-1.5">
              <svg className="w-3.5 h-3.5 text-emerald-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span className="text-xs font-semibold text-emerald-700">
                {consultation.remedy}{consultation.potency ? ` ${consultation.potency}` : ''}
              </span>
              {consultation.pellets && (
                <span className="text-xs text-emerald-600">· {consultation.pellets} гор.</span>
              )}
              {consultation.dosage && (
                <span className="text-xs text-emerald-600 opacity-70">· {consultation.dosage}</span>
              )}
            </div>
          ) : isCompleted && !consultation.remedy ? (
            <div className="mt-2 inline-flex items-center gap-1.5 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5">
              <svg className="w-3.5 h-3.5 text-amber-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126z" />
              </svg>
              <span className="text-xs font-medium text-amber-700">Назначение не выписано</span>
            </div>
          ) : null}
        </Link>
      </div>
    </div>
  )
}

// ─── Карточка ответа пациента (follow-up) ────────────────────────────────────

function FollowupCard({
  event,
  isLast,
}: {
  event: FollowupEvent
  isLast: boolean
}) {
  const { followup } = event
  const cfg = followupConfig[followup.status as keyof typeof followupConfig]
  if (!cfg) return null

  const dateStr = followup.responded_at
    ? formatMsk(followup.responded_at)
    : ''

  return (
    <div className={`relative flex gap-5 ${isLast ? 'pb-0' : 'pb-8'}`}>

      {/* Точка */}
      <div className="flex flex-col items-center shrink-0 w-8">
        <div className={`w-3 h-3 rounded-full z-10 mt-1.5 shrink-0 ${cfg.dot}`} />
        {!isLast && <div className="flex-1 w-px bg-gray-100 mt-1.5" />}
      </div>

      {/* Карточка */}
      <div className="flex-1 min-w-0 pb-1">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs text-gray-400 font-medium">{dateStr}</span>
          <span className="text-[10px] text-gray-300">{daysAgo(event.sortKey)}</span>
        </div>

        <div className="bg-white border border-gray-100 rounded-2xl px-4 py-3.5">
          <div className="flex items-center gap-2 mb-1.5">
            <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border ${cfg.badge}`}>
              {cfg.icon}
              {cfg.label}
            </span>
          </div>
          {followup.comment && (
            <p className="text-sm text-gray-500 italic leading-relaxed">
              «{followup.comment}»
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Главный компонент ────────────────────────────────────────────────────────

type Props = {
  patientId: string
  consultations: Consultation[]
  followupByConsultation: Record<string, Followup>
}

export default function PatientTimeline({ patientId, consultations, followupByConsultation }: Props) {
  if (!consultations.length) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-300 text-sm">Пока нет ни одной консультации</p>
      </div>
    )
  }

  // Сортируем консультации по дате (от старых к новым — для нумерации)
  const sorted = [...consultations].sort((a, b) => consultationSortKey(a) - consultationSortKey(b))

  // Собираем все события таймлайна
  const events: TimelineEvent[] = []

  sorted.forEach((consultation, idx) => {
    const sortKey = consultationSortKey(consultation)
    const followup = followupByConsultation[consultation.id] || null

    events.push({
      kind: 'consultation',
      sortKey,
      consultation,
      index: idx + 1,
      followup,
    })

    // Если есть ответ пациента — добавляем как отдельное событие после консультации
    if (followup?.responded_at && followup.status) {
      events.push({
        kind: 'followup',
        sortKey: new Date(followup.responded_at).getTime(),
        followup,
        consultation,
      })
    }
  })

  // Финальная сортировка всех событий по времени
  events.sort((a, b) => a.sortKey - b.sortKey)

  return (
    <div className="relative">
      {events.map((event, idx) => {
        const isLast = idx === events.length - 1

        if (event.kind === 'consultation') {
          return (
            <ConsultationCard
              key={`c-${event.consultation.id}`}
              event={event}
              patientId={patientId}
              isLast={isLast}
            />
          )
        }

        return (
          <FollowupCard
            key={`f-${event.followup.id}`}
            event={event}
            isLast={isLast}
          />
        )
      })}
    </div>
  )
}
