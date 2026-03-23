'use client'

import { useState } from 'react'
import { createAIIntakeLink } from '@/lib/actions/ai-intake'
import { useLanguage } from '@/hooks/useLanguage'

type Props = {
  patientId: string
}

export default function AIIntakeLinkButton({ patientId }: Props) {
  const { lang } = useLanguage()
  const [link, setLink] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState('')

  async function handleCreate() {
    setLoading(true)
    setError('')
    try {
      const token = await createAIIntakeLink(patientId)
      setLink(`${window.location.origin}/ai-intake/${token}`)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : lang === 'ru' ? 'Ошибка создания анкеты' : 'Error creating form')
    } finally {
      setLoading(false)
    }
  }

  async function handleCopy() {
    if (!link) return
    await navigator.clipboard.writeText(link)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (!link) {
    return (
      <button
        onClick={handleCreate}
        disabled={loading}
        className="btn btn-secondary w-full"
        style={{ borderColor: 'rgba(99,102,241,0.3)', color: '#6366f1' }}
      >
        {loading
          ? (lang === 'ru' ? 'AI генерирует вопросы...' : 'AI generating questions...')
          : (lang === 'ru' ? '✨ AI-анкета' : '✨ AI Intake')}
      </button>
    )
  }

  if (error) {
    return (
      <div className="text-xs text-red-500 px-3 py-2 rounded-lg bg-red-50 border border-red-200">
        {error}
      </div>
    )
  }

  return (
    <div className="border rounded-2xl px-4 py-3 space-y-2" style={{ backgroundColor: 'rgba(99,102,241,0.04)', borderColor: 'rgba(99,102,241,0.2)' }}>
      <p className="text-xs font-semibold" style={{ color: '#6366f1' }}>
        ✨ {lang === 'ru' ? 'Персональная AI-анкета' : 'Personal AI Intake'}
      </p>
      <div className="flex items-center gap-2">
        <p className="text-xs truncate flex-1 rounded-lg px-3 py-1.5 font-mono" style={{ backgroundColor: 'var(--color-input-bg)', border: '1px solid var(--color-border)', color: 'var(--sim-text-sec)' }}>
          {link}
        </p>
        <button
          onClick={handleCopy}
          className="shrink-0 text-xs font-semibold px-3 py-1.5 rounded-lg border text-white transition-all"
          style={{ backgroundColor: copied ? '#4f46e5' : '#6366f1', borderColor: copied ? '#4f46e5' : '#6366f1' }}
        >
          {copied ? '✓' : (lang === 'ru' ? 'Копировать' : 'Copy')}
        </button>
      </div>
      <p className="text-xs" style={{ color: 'var(--sim-text-hint)' }}>
        {lang === 'ru' ? 'Отправьте пациенту. Вопросы подобраны AI на основе истории.' : 'Send to patient. Questions personalized by AI.'}
      </p>
    </div>
  )
}
