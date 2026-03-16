'use client'

import { useState } from 'react'

export default function BookingLinkButton({ doctorId }: { doctorId: string }) {
  const [copied, setCopied] = useState(false)
  const [open, setOpen] = useState(false)

  const url = typeof window !== 'undefined'
    ? `${window.location.origin}/book/${doctorId}`
    : `/book/${doctorId}`

  function copy() {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 text-xs font-medium border border-teal-200 text-teal-700 px-3 py-2 rounded-lg hover:bg-teal-50 hover:border-teal-400 transition-all"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
        </svg>
        Ссылка на онлайн-запись
      </button>
    )
  }

  return (
    <div className="border border-teal-200 bg-teal-50 rounded-xl px-4 py-3 space-y-2">
      <p className="text-xs font-semibold text-teal-700">Ссылка для пациентов:</p>
      <div className="flex items-center gap-2">
        <p className="text-xs truncate flex-1 bg-white border border-teal-200 rounded-lg px-3 py-1.5 font-mono text-teal-700">
          {url}
        </p>
        <button
          onClick={copy}
          className={`shrink-0 text-xs font-semibold px-3 py-1.5 rounded-lg text-white transition-all ${copied ? 'bg-emerald-600' : 'bg-teal-600 hover:bg-teal-700'}`}
        >
          {copied ? '✓ Скопировано' : 'Копировать'}
        </button>
      </div>
      <p className="text-[10px] text-teal-500">Пациент заполнит форму и вы увидите заявку в расписании</p>
    </div>
  )
}
