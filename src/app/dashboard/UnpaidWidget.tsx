'use client'

import { useState } from 'react'
import Link from 'next/link'

type Patient = { id: string; name: string }

export default function UnpaidWidget({ patients }: { patients: Patient[] }) {
  const [open, setOpen] = useState(false)
  if (patients.length === 0) return null

  return (
    <div>
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center justify-between w-full"
      >
        <span className="text-xs text-gray-500">Должны оплатить</span>
        <span
          className="text-sm font-semibold"
          style={{ fontFamily: 'var(--font-cormorant, Georgia, serif)', color: '#c0392b' }}
        >
          {patients.length} {patients.length === 1 ? 'пациент' : patients.length < 5 ? 'пациента' : 'пациентов'}
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
