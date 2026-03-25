'use client'

import { useState } from 'react'
import { createBookingLinkForPatient } from '@/lib/actions/newPatient'
import { useToast } from '@/components/ui/toast'

type Props = {
  patientId: string
  patientName: string
}

export default function BookingLinkButton({ patientId, patientName }: Props) {
  const [link, setLink] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const { toast } = useToast()

  async function handleCreate() {
    setLoading(true)
    try {
      const token = await createBookingLinkForPatient(patientId)
      setLink(`${window.location.origin}/new/${token}`)
    } catch {
      toast('Ошибка создания ссылки', 'error')
    }
    setLoading(false)
  }

  async function handleCopy() {
    if (!link) return
    await navigator.clipboard.writeText(link)
    setCopied(true)
    toast('Ссылка скопирована', 'success')
    setTimeout(() => setCopied(false), 2000)
  }

  if (!link) {
    return (
      <button
        onClick={handleCreate}
        disabled={loading}
        className="w-full flex items-center gap-2 px-4 py-3 rounded-full text-[13px] font-medium transition-all"
        style={{
          backgroundColor: 'var(--sim-bg-card)',
          border: '1px solid var(--sim-border)',
          color: 'var(--sim-text)',
        }}
      >
        <svg className="w-4 h-4 shrink-0" style={{ color: 'var(--sim-green)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m9.86-2.904a4.5 4.5 0 00-1.242-7.244l4.5-4.5a4.5 4.5 0 016.364 6.364l-1.757 1.757" />
        </svg>
        <span className="truncate">{loading ? 'Создаю...' : 'Ссылка для записи'}</span>
      </button>
    )
  }

  return (
    <div className="rounded-xl px-4 py-3 space-y-2" style={{ backgroundColor: 'rgba(45,106,79,0.04)', border: '1px solid rgba(45,106,79,0.15)' }}>
      <p className="text-xs font-semibold" style={{ color: 'var(--sim-green)' }}>
        Ссылка для записи
      </p>
      <div className="flex items-center gap-2">
        <p className="text-xs truncate flex-1 rounded-full px-3 py-1.5 font-mono" style={{ backgroundColor: 'var(--sim-bg-card)', border: '1px solid var(--sim-border)', color: 'var(--sim-text-muted)' }}>
          {link}
        </p>
        <button onClick={handleCopy} className="btn btn-primary text-xs shrink-0">
          {copied ? '✓' : 'Копировать'}
        </button>
      </div>
      <p className="text-[11px]" style={{ color: 'var(--sim-text-muted)' }}>
        Отправьте {patientName} — выберет удобное время из вашего расписания
      </p>
    </div>
  )
}
