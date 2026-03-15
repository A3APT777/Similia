'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Patient } from '@/types'
import { getAge, formatDateShort, preview } from '@/lib/utils'

type PatientWithLastConsultation = Patient & {
  last_consultation_date?: string | null
  last_consultation_preview?: string | null
  pending_prescription?: boolean
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  return ((parts[0]?.[0] || '') + (parts[1]?.[0] || '')).toUpperCase()
}

const AVATAR_COLORS = [
  { bg: 'bg-emerald-100', text: 'text-emerald-700' },
  { bg: 'bg-sky-100',     text: 'text-sky-700'     },
  { bg: 'bg-violet-100',  text: 'text-violet-700'  },
  { bg: 'bg-amber-100',   text: 'text-amber-700'   },
  { bg: 'bg-rose-100',    text: 'text-rose-700'    },
  { bg: 'bg-teal-100',    text: 'text-teal-700'    },
  { bg: 'bg-orange-100',  text: 'text-orange-700'  },
  { bg: 'bg-indigo-100',  text: 'text-indigo-700'  },
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
    (p.phone || '').includes(search)
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
          className="w-full bg-white border border-gray-200 rounded-xl pl-9 pr-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-emerald-400 focus:ring-3 focus:ring-emerald-500/10 transition-all shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
        />
      </div>

      {/* Пустое состояние */}
      {filtered.length === 0 && (
        <div className="bg-white border border-gray-100 rounded-2xl py-16 text-center shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <div className="w-10 h-10 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center mx-auto mb-3">
            <svg className="w-4.5 h-4.5 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
            </svg>
          </div>
          <p className="text-sm text-gray-400">
            {search ? 'Ничего не найдено' : 'Пока нет ни одного пациента'}
          </p>
          {!search && (
            <p className="text-xs text-gray-300 mt-1">Добавьте первого пациента через сайдбар</p>
          )}
        </div>
      )}

      {/* Таблица пациентов */}
      {filtered.length > 0 && (
        <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.04)]">

          {/* Шапка */}
          <div className="flex items-center gap-3 px-4 py-2.5 border-b border-gray-50 bg-[#fafafa]">
            <div className="w-7 shrink-0" />
            <div className="flex-1 min-w-0">
              <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-[0.08em]">Пациент</span>
            </div>
            <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-[0.08em] w-20 text-right shrink-0">Визит</span>
          </div>

          {/* Строки */}
          <div className="divide-y divide-gray-50">
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
                  className="flex items-center gap-3 px-4 py-3 hover:bg-[#fafafa] transition-colors group"
                >
                  {/* Аватар */}
                  <div className="relative shrink-0">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-semibold ${color.bg} ${color.text}`}>
                      {getInitials(patient.name)}
                    </div>
                    {patient.pending_prescription && (
                      <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-amber-400 border-[1.5px] border-white rounded-full" />
                    )}
                  </div>

                  {/* Основная информация */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2">
                      <p className="text-[13px] font-medium text-gray-900 group-hover:text-emerald-700 transition-colors truncate leading-snug">
                        {patient.name}
                      </p>
                      {meta && (
                        <p className="text-[11px] text-gray-400 shrink-0 hidden sm:block">{meta}</p>
                      )}
                    </div>
                    {notePreview && (
                      <p className="text-[11px] text-gray-400 mt-0.5 truncate leading-snug">
                        {notePreview}
                      </p>
                    )}
                  </div>

                  {/* Дата + стрелка */}
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[11px] text-gray-400 tabular-nums w-16 text-right">
                      {patient.last_consultation_date
                        ? formatDateShort(patient.last_consultation_date)
                        : formatDateShort(patient.first_visit_date)}
                    </span>
                    <svg className="w-3.5 h-3.5 text-gray-300 group-hover:text-gray-400 transition-colors -mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                    </svg>
                  </div>
                </Link>
              )
            })}
          </div>

          {/* Итог */}
          <div className="px-4 py-2.5 border-t border-gray-50 bg-[#fafafa]">
            <p className="text-[11px] text-gray-400">
              {filtered.length} {filtered.length === 1 ? 'пациент' : filtered.length < 5 ? 'пациента' : 'пациентов'}
              {search && ` · найдено по запросу «${search}»`}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
