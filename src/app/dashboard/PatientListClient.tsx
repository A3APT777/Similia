'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Patient } from '@/types'
import { getAge, formatDateShort, preview } from '@/lib/shared/utils'
import { t } from '@/lib/shared/i18n'
import { useLanguage } from '@/hooks/useLanguage'

/* ── Утилиты ── */

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  return ((parts[0]?.[0] || '') + (parts[1]?.[0] || '')).toUpperCase()
}

const AVATAR_HUES = [152, 38, 24, 210, 340, 168, 270, 45]
function getAvatarHue(name: string): number {
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % AVATAR_HUES.length
  return AVATAR_HUES[h]
}

/* ── Типы ── */

type PatientWithLastConsultation = Patient & {
  last_consultation_date?: string | null
  last_consultation_preview?: string | null
  pending_prescription?: boolean
  overdue?: boolean
  pending_followup_days?: number | null
}

/* ── Пустое состояние ── */

function EmptyState({ hasSearch, search, lang }: { hasSearch: boolean; search: string; lang: 'ru' | 'en' }) {
  return (
    <div className="py-16 text-center">
      <div
        className="w-12 h-12 mx-auto mb-4 rounded-xl flex items-center justify-center"
        style={{ backgroundColor: 'rgba(45,90,70,0.06)' }}
      >
        <svg className="w-5 h-5" style={{ color: 'var(--sim-text-muted)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          {hasSearch
            ? <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            : <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
          }
        </svg>
      </div>
      <p className="text-sm font-medium" style={{ color: 'var(--sim-text)' }}>
        {hasSearch ? t(lang).patientList.nothingFound(search) : t(lang).patientList.noPatients}
      </p>
      {!hasSearch && (
        <p className="text-xs mt-1" style={{ color: 'var(--sim-text-muted)' }}>
          {t(lang).patientList.noPatientsDesc}
        </p>
      )}
    </div>
  )
}

/* ── Фильтр-чип ── */

function FilterChip({ active, color, label, onClick }: { active: boolean; color: string; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1.5 text-[11px] font-medium px-3 py-2 min-h-[36px] rounded-full transition-all duration-200"
      style={{
        backgroundColor: active ? `${color}15` : 'transparent',
        color: active ? color : 'var(--sim-text-muted)',
        border: `1px solid ${active ? `${color}30` : 'var(--sim-border)'}`,
      }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full transition-all duration-200"
        style={{ backgroundColor: color, opacity: active ? 1 : 0.4 }}
      />
      {label}
      {active && (
        <span className="ml-0.5 opacity-60 hover:opacity-100 transition-opacity">×</span>
      )}
    </button>
  )
}

/* ── Главный компонент ── */

export default function PatientListClient({
  patients, filterPending = false, filterOverdue = false, lockedPatientIds = []
}: {
  patients: PatientWithLastConsultation[]
  filterPending?: boolean
  filterOverdue?: boolean
  lockedPatientIds?: string[]
}) {
  const lockedSet = new Set(lockedPatientIds)
  const { lang } = useLanguage()
  const [search, setSearch] = useState('')
  const [pendingOnly, setPendingOnly] = useState(filterPending)
  const [overdueOnly, setOverdueOnly] = useState(filterOverdue)
  const [followupOnly, setFollowupOnly] = useState(false)

  const filtered = patients
    .filter(p => !pendingOnly || p.pending_prescription)
    .filter(p => !overdueOnly || p.overdue)
    .filter(p => !followupOnly || !!p.pending_followup_days)
    .filter(p =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.phone || '').includes(search) ||
      (p.email || '').toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => {
      if (followupOnly) return (b.pending_followup_days ?? 0) - (a.pending_followup_days ?? 0)
      return 0
    })

  const hasFilters = pendingOnly || overdueOnly || followupOnly
  const hasFollowupPatients = patients.some(p => p.pending_followup_days)

  return (
    <div>
      {/* ── Поиск ── */}
      <div className="relative mb-3">
        <svg
          className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none transition-colors duration-200"
          style={{ color: 'var(--sim-text-muted)' }}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          aria-label={lang === 'ru' ? 'Поиск пациента' : 'Search patient'}
          placeholder={t(lang).patientList.search}
          className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl bg-transparent transition-all duration-200 focus:outline-none"
          style={{
            border: '1px solid var(--sim-border)',
            color: 'var(--sim-text)',
          }}
          onFocus={e => { e.currentTarget.style.borderColor = 'var(--sim-green)'; e.currentTarget.style.backgroundColor = 'var(--sim-bg-card)' }}
          onBlur={e => { e.currentTarget.style.borderColor = 'var(--sim-border)'; e.currentTarget.style.backgroundColor = 'transparent' }}
        />
      </div>

      {/* ── Фильтры ── */}
      {(hasFilters || hasFollowupPatients) && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {(pendingOnly || patients.some(p => p.pending_prescription)) && (
            <FilterChip
              active={pendingOnly}
              color="#b45309"
              label={lang === 'ru' ? 'Без назначения' : 'No prescription'}
              onClick={() => setPendingOnly(v => !v)}
            />
          )}
          {(overdueOnly || patients.some(p => p.overdue)) && (
            <FilterChip
              active={overdueOnly}
              color="#ea580c"
              label={lang === 'ru' ? 'Без повторного' : 'Overdue'}
              onClick={() => setOverdueOnly(v => !v)}
            />
          )}
          {hasFollowupPatients && (
            <FilterChip
              active={followupOnly}
              color="#eab308"
              label={lang === 'ru' ? 'Ждут ответа' : 'Awaiting'}
              onClick={() => setFollowupOnly(v => !v)}
            />
          )}
        </div>
      )}

      {/* ── Пустое ── */}
      {filtered.length === 0 && (
        <EmptyState hasSearch={!!search} search={search} lang={lang} />
      )}

      {/* ── Список ── */}
      {filtered.length > 0 && (
        <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--sim-border)' }}>
          {filtered.map((patient, idx) => {
            const isDemo = patient.notes?.startsWith('⚠️ Демо-пациент') ?? false
            const isLocked = lockedSet.has(patient.id)
            const hue = getAvatarHue(patient.name)
            const meta = [
              patient.birth_date ? getAge(patient.birth_date) : null,
              patient.phone || null,
            ].filter(Boolean).join(' · ')
            const notePreview = patient.last_consultation_preview ? preview(patient.last_consultation_preview, 48) : null
            const isLast = idx === filtered.length - 1

            /* Заблокированный пациент */
            if (isLocked) {
              return (
                <Link
                  key={patient.id}
                  href="/pricing"
                  className="flex items-center gap-3 px-4 py-3 transition-all duration-200"
                  style={{
                    borderBottom: isLast ? 'none' : '1px solid var(--sim-border)',
                    opacity: 0.4,
                    backgroundColor: 'var(--sim-bg-card)',
                  }}
                >
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: 'rgba(0,0,0,0.04)' }}>
                    <svg className="w-4 h-4" style={{ color: 'var(--sim-text-muted)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                    </svg>
                  </div>
                  <span className="flex-1 text-sm font-medium truncate" style={{ color: 'var(--sim-text-muted)' }}>{patient.name}</span>
                  <span className="text-[11px] shrink-0" style={{ color: 'var(--sim-text-muted)' }}>
                    {lang === 'ru' ? 'Стандарт' : 'Standard'}
                  </span>
                </Link>
              )
            }

            /* Обычный пациент */
            return (
              <Link
                key={patient.id}
                href={`/patients/${patient.id}`}
                className="group flex items-center gap-3 px-4 py-3 transition-all duration-200 relative"
                style={{
                  borderBottom: isLast ? 'none' : '1px solid var(--sim-border)',
                  backgroundColor: 'var(--sim-bg-card)',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.backgroundColor = 'var(--sim-bg-hover, rgba(45,90,70,0.03))'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.backgroundColor = 'var(--sim-bg-card)'
                }}
              >
                {/* Левый акцент при hover */}
                <div
                  className="absolute left-0 top-2 bottom-2 w-[2px] rounded-full opacity-0 group-hover:opacity-100 transition-all duration-300"
                  style={{ backgroundColor: 'var(--sim-green)' }}
                />

                {/* Аватар */}
                <div className="relative shrink-0">
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center text-[13px] font-semibold transition-transform duration-200 group-hover:scale-105"
                    style={{
                      backgroundColor: `hsl(${hue}, 25%, 92%)`,
                      color: `hsl(${hue}, 40%, 35%)`,
                    }}
                  >
                    {getInitials(patient.name)}
                  </div>
                  {/* Индикаторы статуса */}
                  {patient.pending_prescription && (
                    <span
                      className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full"
                      style={{ backgroundColor: '#b45309', border: '1.5px solid var(--sim-bg-card)' }}
                    />
                  )}
                  {patient.overdue && !patient.pending_prescription && (
                    <span
                      className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full"
                      style={{ backgroundColor: '#ea580c', border: '1.5px solid var(--sim-bg-card)' }}
                    />
                  )}
                </div>

                {/* Информация */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2">
                    <p className="text-sm font-medium truncate" style={{ color: 'var(--sim-text)' }}>
                      {patient.name}
                    </p>
                    {isDemo && (
                      <span
                        className="shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded"
                        style={{ backgroundColor: 'rgba(100,116,139,0.08)', color: 'var(--sim-text-muted)' }}
                      >
                        Демо
                      </span>
                    )}
                    {patient.pending_followup_days && (
                      <span
                        className="shrink-0 flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded"
                        style={{ backgroundColor: 'rgba(234,179,8,0.1)', color: '#92400e' }}
                        title={lang === 'ru' ? `Ожидает ответа на опросник ${patient.pending_followup_days} дн.` : `Waiting for followup ${patient.pending_followup_days}d`}
                      >
                        <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: 'var(--sim-amber)' }} />
                        {patient.pending_followup_days}д
                      </span>
                    )}
                  </div>
                  {meta && (
                    <p className="text-[12px] mt-0.5 truncate hidden sm:block" style={{ color: 'var(--sim-text-muted)' }}>{meta}</p>
                  )}
                  {notePreview && (
                    <p className="text-[12px] mt-0.5 truncate italic hidden lg:block" style={{ color: 'var(--sim-text-hint, rgba(0,0,0,0.3))' }}>{notePreview}</p>
                  )}
                </div>

                {/* Дата */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <span
                    className="text-[12px] tabular-nums font-medium"
                    style={{ color: patient.overdue ? '#ea580c' : 'var(--sim-text-muted)' }}
                  >
                    {patient.last_consultation_date
                      ? formatDateShort(patient.last_consultation_date)
                      : formatDateShort(patient.first_visit_date)}
                  </span>
                  <svg
                    className="w-3.5 h-3.5 opacity-0 group-hover:opacity-50 transition-opacity duration-200 -mr-1"
                    fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                    style={{ color: 'var(--sim-text-muted)' }}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                  </svg>
                </div>
              </Link>
            )
          })}

          {/* Итог */}
          <div className="px-4 py-2" style={{ borderTop: '1px solid var(--sim-border)', backgroundColor: 'rgba(0,0,0,0.01)' }}>
            <p className="text-[11px]" style={{ color: 'var(--sim-text-muted)' }}>
              {t(lang).patientList.countPatients(filtered.length)}
              {search && ` · ${t(lang).patientList.foundByQuery}`}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
