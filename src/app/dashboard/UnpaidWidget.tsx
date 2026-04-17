'use client'

import { useState } from 'react'
import Link from 'next/link'
import { t } from '@/lib/shared/i18n'
import { useLanguage } from '@/hooks/useLanguage'
import type { PatientPreview } from '@/types'

export default function UnpaidWidget({ patients }: { patients: PatientPreview[] }) {
  const { lang } = useLanguage()
  const [open, setOpen] = useState(false)
  if (patients.length === 0) return null

  return (
    <div>
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center justify-between w-full"
      >
        <span className="text-xs text-gray-500">{t(lang).unpaid.title}</span>
        <span
          className="text-sm font-semibold"
          style={{ fontFamily: 'var(--font-cormorant, Georgia, serif)', color: '#c0392b' }}
        >
          {t(lang).unpaid.countPatients(patients.length)}
        </span>
      </button>

      {open && (
        <div className="mt-2 space-y-1">
          {patients.map(p => (
            <Link
              key={p.id}
              href={`/patients/${p.id}`}
              className="block text-xs px-2 py-1.5 rounded-lg hover:bg-red-50 transition-colors truncate"
              style={{ color: '#c0392b' }}
            >
              {p.name}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
