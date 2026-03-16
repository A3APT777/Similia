'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Patient } from '@/types'
import { getAge, formatDateShort, preview } from '@/lib/utils'

function EmptyState({ hasSearch, search }: { hasSearch: boolean; search: string }) {
  if (hasSearch) {
    return (
      <div className="border rounded-2xl py-12 text-center" style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}>
        <svg className="w-8 h-8 mx-auto mb-3" style={{ color: 'var(--color-border)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <p className="text-sm text-gray-400">Ничего не найдено по запросу «{search}»</p>
      </div>
    )
  }

  return (
    <div className="border rounded-2xl py-10 px-6 text-center" style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)' }}>
      <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: 'rgba(45,106,79,0.08)', border: '1px solid rgba(45,106,79,0.15)' }}>
        <svg className="w-7 h-7" style={{ color: 'var(--color-primary)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
        </svg>
      </div>
      <p className="text-sm font-medium text-gray-700 mb-1">Пока нет ни одного пациента</p>
      <p className="text-xs text-gray-400 mb-5 max-w-xs mx-auto">
        Добавьте первого пациента вручную или отправьте анкету — она создаст карточку автоматически
      </p>
      <div className="flex flex-col sm:flex-row gap-2 justify-center">
        <Link
          href="/patients/new"
          className="inline-flex items-center justify-center gap-1.5 text-xs font-medium text-white px-4 py-2.5 rounded-xl transition-colors"
          style={{ backgroundColor: 'var(--color-primary)' }}
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Добавить пациента
        </Link>
        <a
          href="#intake"
          onClick={(e) => { e.preventDefault(); document.querySelector<HTMLButtonElement>('[data-intake-btn]')?.click() }}
          className="inline-flex items-center justify-center gap-1.5 text-xs font-medium px-4 py-2.5 rounded-xl transition-colors border"
          style={{ borderColor: 'var(--color-primary)', color: 'var(--color-primary)', backgroundColor: 'transparent' }}
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Отправить анкету
        </a>
      </div>
    </div>
  )
}

type PatientWithLastConsultation = Patient & {
  last_consultation_date?: string | null
  last_consultation_preview?: string | null
  pending_prescription?: boolean
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  return ((parts[0]?.[0] || '') + (parts[1]?.[0] || '')).toUpperCase()
}

// Пергаментные оттенки для аватаров — тёплые, в духе сайта
const AVATAR_COLORS = [
  { bg: 'rgba(45,106,79,0.12)',   text: '#1a5c38' },
  { bg: 'rgba(200,160,53,0.14)',  text: '#8a6010' },
  { bg: 'rgba(100,60,30,0.10)',   text: '#6b3a1f' },
  { bg: 'rgba(45,90,130,0.10)',   text: '#1e4d75' },
  { bg: 'rgba(130,45,60,0.10)',   text: '#7a1f35' },
  { bg: 'rgba(60,100,80,0.12)',   text: '#2a5c42' },
  { bg: 'rgba(90,70,140,0.10)',   text: '#4a3080' },
  { bg: 'rgba(140,90,30,0.12)',   text: '#7a4a10' },
]

function getAvatarColor(name: string) {
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % AVATAR_COLORS.length
  return AVATAR_COLORS[h]
}

export default function PatientListClient({ patients }: { patients: PatientWithLastConsultation[] }) {
  const [search, setSearch] = useState('')

  const filtered = patients.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.phone || '').includes(search) ||
    (p.email || '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div>
      {/* Поиск */}
      <div className="relative mb-3">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Поиск пациента..."
          className="w-full rounded-xl pl-9 pr-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none transition-all"
          style={{ backgroundColor: '#faf7f2', border: '1px solid #d4c9b8', outline: 'none' }}
          onFocus={e => (e.currentTarget.style.borderColor = 'var(--color-primary)')}
          onBlur={e => (e.currentTarget.style.borderColor = '#d4c9b8')}
        />
      </div>

      {/* Пустое состояние */}
      {filtered.length === 0 && (
        <EmptyState hasSearch={!!search} search={search} />
      )}

      {/* Таблица пациентов */}
      {filtered.length > 0 && (
        <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: 'var(--color-card)', border: '1px solid #d4c9b8' }}>

          {/* Шапка */}
          <div className="flex items-center gap-3 px-4 py-2.5" style={{ borderBottom: '0.5px solid #e0d8cc', backgroundColor: '#ede7dd' }}>
            <div className="w-7 shrink-0" />
            <div className="flex-1 min-w-0">
              <span className="text-[12px] font-semibold uppercase tracking-[0.08em]" style={{ color: '#9a8a6a' }}>Пациент</span>
            </div>
            <span className="text-[12px] font-semibold uppercase tracking-[0.08em] w-20 text-right shrink-0" style={{ color: '#9a8a6a' }}>Визит</span>
          </div>

          {/* Строки */}
          <div style={{ borderColor: 'var(--color-border-light)' }}>
            {filtered.map(patient => {
              const color = getAvatarColor(patient.name)
              const meta = [
                patient.birth_date ? getAge(patient.birth_date) : null,
                patient.phone || null,
              ].filter(Boolean).join(' · ')

              const notePreview = patient.last_consultation_preview
                ? preview(patient.last_consultation_preview, 48)
                : null

              return (
                <Link
                  key={patient.id}
                  href={`/patients/${patient.id}`}
                  className="flex items-center gap-3 px-4 transition-colors group"
                  style={{ borderBottom: '1px solid #e0d8cc', minHeight: '64px', paddingTop: '10px', paddingBottom: '10px' }}
                  onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#e8f0e8'; e.currentTarget.style.boxShadow = 'inset 3px 0 0 #2d6a4f' }}
                  onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.boxShadow = 'none' }}
                >
                  {/* Аватар */}
                  <div className="relative shrink-0">
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center font-semibold text-white"
                      style={{ backgroundColor: '#1a3020', fontSize: '14px' }}
                    >
                      {getInitials(patient.name)}
                    </div>
                    {patient.pending_prescription && (
                      <span
                        className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full"
                        style={{ backgroundColor: 'var(--color-amber)', border: '1.5px solid var(--color-card)' }}
                      />
                    )}
                  </div>

                  {/* Основная информация */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2">
                      <p className="font-semibold truncate leading-snug" style={{ fontSize: '15px', color: '#1a1a0a' }}>
                        {patient.name}
                      </p>
                      {meta && (
                        <p className="shrink-0 hidden sm:block" style={{ fontSize: '13px', color: '#5a5040' }}>{meta}</p>
                      )}
                    </div>
                    {notePreview && (
                      <p className="mt-0.5 truncate leading-snug italic" style={{ fontSize: '13px', color: '#9a8a6a' }}>
                        {notePreview}
                      </p>
                    )}
                  </div>

                  {/* Дата + стрелка */}
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="tabular-nums w-16 text-right font-medium" style={{ fontSize: '13px', color: '#2d6a4f' }}>
                      {patient.last_consultation_date
                        ? formatDateShort(patient.last_consultation_date)
                        : formatDateShort(patient.first_visit_date)}
                    </span>
                    <svg className="w-3.5 h-3.5 -mr-1 transition-colors" style={{ color: '#c4b89a' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                    </svg>
                  </div>
                </Link>
              )
            })}
          </div>

          {/* Итог */}
          <div className="px-4 py-2.5" style={{ borderTop: '0.5px solid #e0d8cc', backgroundColor: '#ede7dd' }}>
            <p className="text-[13px]" style={{ color: '#9a8a6a' }}>
              {filtered.length} {filtered.length === 1 ? 'пациент' : filtered.length < 5 ? 'пациента' : 'пациентов'}
              {search && ` · найдено по запросу «${search}»`}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
