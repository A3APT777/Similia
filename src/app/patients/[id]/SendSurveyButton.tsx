'use client'

import { useState } from 'react'
import { createPreVisitSurvey } from '@/lib/actions/surveys'

export default function SendSurveyButton({ patientId, patientName }: { patientId: string; patientName: string }) {
  const [link, setLink] = useState('')
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  async function handleCreate() {
    setLoading(true)
    try {
      const { token } = await createPreVisitSurvey(patientId)
      const url = `${window.location.origin}/survey/${token}`
      setLink(url)
    } catch (err) {
      alert('Не удалось создать опросник')
    } finally {
      setLoading(false)
    }
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(link)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (link) {
    return (
      <div className="rounded-xl px-4 py-3 space-y-2" style={{ backgroundColor: 'rgba(45,106,79,0.04)', border: '1px solid rgba(45,106,79,0.15)' }}>
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em]" style={{ color: 'var(--sim-green)' }}>Опросник</p>
        <div className="flex items-center gap-2">
          <p className="text-xs truncate flex-1 rounded-full px-3 py-1.5 font-mono" style={{ backgroundColor: 'var(--sim-bg-card)', border: '1px solid var(--sim-border)', color: 'var(--sim-text-muted)' }}>
            {link}
          </p>
          <button onClick={handleCopy} className="btn btn-primary text-xs shrink-0">
            {copied ? '✓' : 'Копировать'}
          </button>
        </div>
        <p className="text-[11px]" style={{ color: 'var(--sim-text-muted)', lineHeight: 1.5 }}>Скопируйте ссылку и отправьте {patientName}. Пациент заполнит опросник перед визитом — ответы появятся в вашей следующей консультации.</p>
      </div>
    )
  }

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
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
      <span className="truncate">{loading ? 'Создаю...' : 'Опросник перед консультацией'}</span>
    </button>
  )
}
