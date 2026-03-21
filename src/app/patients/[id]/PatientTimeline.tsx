import Link from 'next/link'
import { Consultation, Followup } from '@/types'
import { preview } from '@/lib/utils'
import { t } from '@/lib/i18n'
import { useLanguage } from '@/hooks/useLanguage'

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
function daysAgo(timestamp: number, lang: Parameters<typeof t>[0]): string {
  const tr = t(lang).timeline
  const diff = Math.floor((Date.now() - timestamp) / 86400000)
  if (diff === 0) return tr.today
  if (diff === 1) return tr.yesterday
  if (diff < 7) return tr.daysAgo(diff)
  if (diff < 30) return tr.weeksAgo(Math.floor(diff / 7))
  if (diff < 365) return tr.monthsAgo(Math.floor(diff / 30))
  return tr.yearsAgo(Math.floor(diff / 365))
}

// ─── Конфигурация статусов follow-up ─────────────────────────────────────────

const followupStyles = {
  better: {
    dot: 'bg-[#2d6a4f]',
    badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    icon: (
      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 10.5L12 3m0 0l7.5 7.5M12 3v18" />
      </svg>
    ),
  },
  same: {
    dot: 'bg-gray-400',
    badge: 'bg-gray-50 text-gray-600 border-gray-200',
    icon: (
      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 12H3m14 0l-4-4m4 4l-4 4" />
      </svg>
    ),
  },
  worse: {
    dot: 'bg-red-500',
    badge: 'bg-red-50 text-red-600 border-red-200',
    icon: (
      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 13.5L12 21m0 0l-7.5-7.5M12 21V3" />
      </svg>
    ),
  },
  new_symptoms: {
    dot: 'bg-orange-400',
    badge: 'bg-orange-50 text-orange-700 border-orange-200',
    icon: (
      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126z" />
      </svg>
    ),
  },
}

const followupLabelKeys: Record<string, string> = {
  better: 'better',
  same: 'same',
  worse: 'worse',
  new_symptoms: 'newSymptoms',
}

// ─── Карточка консультации ────────────────────────────────────────────────────

function ConsultationCard({
  event,
  patientId,
  isLast,
  lang,
}: {
  event: ConsultationEvent
  patientId: string
  isLast: boolean
  lang: Parameters<typeof t>[0]
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
    ? t(lang).timeline.acuteCase
    : index === 1
    ? t(lang).timeline.firstConsultation
    : t(lang).timeline.consultationN(index)

  const dotColor = isCancelled
    ? 'bg-gray-300 border-gray-200'
    : isScheduled
    ? `${isAcute ? 'border-orange-300' : 'border-emerald-300'}`
    : isInProgress
    ? 'bg-amber-400 border-amber-300'
    : isAcute
    ? 'bg-orange-400 border-orange-300'
    : 'bg-[#2d6a4f] border-emerald-400'

  return (
    <div className={`relative flex gap-5 pb-8 ${isLast && !followup ? 'pb-0' : ''} ${isCancelled ? 'opacity-50' : ''}`}>

      {/* Вертикальная линия + точка */}
      <div className="flex flex-col items-center shrink-0 w-8">
        <div className={`w-3.5 h-3.5 rounded-full border-2 z-10 mt-1 shrink-0 ${dotColor} ${isScheduled ? 'ring-2 ring-emerald-100' : ''}`} style={isScheduled ? { backgroundColor: '#f5f0e8' } : undefined} />
        {(!isLast || !!followup) && (
          <div className="flex-1 w-px bg-gray-100 mt-1.5" />
        )}
      </div>

      {/* Карточка */}
      <div className="flex-1 min-w-0 pb-1">
        {/* Дата + тег относительного времени */}
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          <span className="font-medium" style={{ fontSize: '14px', color: 'var(--sim-forest)' }}>{dateStr}</span>
          {!isScheduled && !isCancelled && (
            <span style={{ fontSize: '12px', color: 'var(--sim-text-hint)' }}>{daysAgo(event.sortKey, lang)}</span>
          )}
          {isAcute && !isCancelled && (
            <span className="text-[12px] font-semibold px-2 py-0.5 rounded-full bg-orange-50 text-orange-600 border border-orange-200">
              ⚡ {t(lang).consultation.acuteShort}
            </span>
          )}
          {isScheduled && (
            <span className={`text-[12px] font-semibold px-2 py-0.5 rounded-full border ${
              isAcute
                ? 'bg-orange-50 text-orange-700 border-orange-200'
                : 'bg-emerald-50 text-emerald-700 border-emerald-200'
            }`}>
              {t(lang).timeline.upcoming}
            </span>
          )}
          {isInProgress && (
            <span className="text-[12px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
              {t(lang).timeline.inProgress}
            </span>
          )}
          {isCancelled && (
            <span className="text-[12px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-400">
              {t(lang).timeline.cancelled}
            </span>
          )}
        </div>

        <Link
          href={`/patients/${patientId}/consultations/${consultation.id}`}
          className="group block transition-all"
          style={{
            backgroundColor: '#f0ebe3',
            border: '1px solid var(--sim-border)',
            borderLeft: isAcute ? '4px solid #c8a035' : '4px solid #2d6a4f',
            borderRadius: '8px',
            padding: '16px',
          }}
        >
          <p className="mb-1.5 font-semibold" style={{ fontSize: '15px', color: isAcute ? '#c8a035' : '#1a1a0a' }}>
            {title}
          </p>

          {/* Назначение — всегда первое, bold, акцент */}
          {isCompleted && consultation.remedy ? (
            <div className="mb-1.5 flex items-baseline gap-2 flex-wrap">
              <span style={{ fontSize: '16px', fontWeight: 700, color: 'var(--sim-forest)', fontFamily: 'var(--font-cormorant, Georgia, serif)' }}>
                {consultation.remedy}
              </span>
              <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--sim-green)' }}>
                {consultation.potency}
              </span>
              {consultation.pellets && (
                <span style={{ fontSize: '12px', color: 'var(--sim-text-hint)' }}>{consultation.pellets} {t(lang).timeline.pellets}</span>
              )}
            </div>
          ) : isCompleted && !consultation.remedy ? (
            <div className="mb-1.5">
              <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--sim-amber)' }}>{t(lang).timeline.noPrescription}</span>
            </div>
          ) : null}

          {/* Краткое содержание — вторичный текст */}
          {isScheduled ? (
            <p style={{ fontSize: '13px', color: 'var(--sim-text-hint)', fontStyle: 'italic' }}>{t(lang).timeline.scheduledAppointment}</p>
          ) : isCompleted && (consultation.complaints || consultation.notes) ? (
            <p style={{ fontSize: '13px', color: '#7a7060', lineHeight: '1.5' }}>
              {preview(consultation.complaints || consultation.notes || '', 100)}
            </p>
          ) : isInProgress ? (
            <p style={{ fontSize: '13px', color: 'var(--sim-text-hint)', fontStyle: 'italic' }}>{t(lang).timeline.appointmentInProgress}</p>
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
  lang,
}: {
  event: FollowupEvent
  isLast: boolean
  lang: Parameters<typeof t>[0]
}) {
  const { followup } = event
  const status = followup.status || ''
  const style = followupStyles[status as keyof typeof followupStyles]
  const labelKey = followupLabelKeys[status]
  const cfg = style && labelKey ? { ...style, label: (t(lang).timeline as Record<string, any>)[labelKey] as string } : null
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
          <span className="font-medium" style={{ fontSize: '14px', color: 'var(--sim-forest)' }}>{dateStr}</span>
          <span style={{ fontSize: '12px', color: 'var(--sim-text-hint)' }}>{daysAgo(event.sortKey, lang)}</span>
        </div>

        <div style={{ backgroundColor: '#f0ebe3', border: '1px solid var(--sim-border)', borderRadius: '8px', padding: '16px' }}>
          <div className="flex items-center gap-2 mb-1.5">
            <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border ${cfg.badge}`}>
              {cfg.icon}
              {cfg.label}
            </span>
          </div>
          {followup.comment && (
            <p className="text-[15px] text-gray-500 italic leading-relaxed">
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
  const { lang } = useLanguage()

  if (!consultations.length) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-300 text-sm">{t(lang).timeline.noConsultations}</p>
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
              lang={lang}
            />
          )
        }

        return (
          <FollowupCard
            key={`f-${event.followup.id}`}
            event={event}
            isLast={isLast}
            lang={lang}
          />
        )
      })}
    </div>
  )
}
