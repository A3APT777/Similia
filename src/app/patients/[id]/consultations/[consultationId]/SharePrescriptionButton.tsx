'use client'

import { useState } from 'react'
import { createPrescriptionShare } from '@/lib/actions/prescriptionShare'

export default function SharePrescriptionButton({ consultationId }: { consultationId: string }) {
  const [link, setLink] = useState('')
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [note, setNote] = useState('')
  const [showNote, setShowNote] = useState(false)

  async function handleCreate() {
    setLoading(true)
    try {
      const { token } = await createPrescriptionShare(consultationId, note || undefined)
      setLink(`${window.location.origin}/rx/${token}`)
    } catch (err) {
      alert('Не удалось создать ссылку на назначение')
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
      <div className="rounded-xl p-3 space-y-2" style={{ backgroundColor: '#f4f9f5', border: '1px solid #c6e5cc' }}>
        <p className="text-xs font-medium" style={{ color: 'var(--sim-green)' }}>Ссылка на назначение:</p>
        <div className="flex items-center gap-2">
          <input
            readOnly
            value={link}
            className="flex-1 text-xs bg-white border border-gray-200 rounded-lg px-3 py-2 truncate"
          />
          <button
            onClick={handleCopy}
            className="shrink-0 px-3 py-2 rounded-lg text-xs font-medium text-white transition-colors"
            style={{ backgroundColor: copied ? '#16a34a' : '#2d6a4f' }}
          >
            {copied ? '✓' : 'Копировать'}
          </button>
        </div>
        <p className="text-xs" style={{ color: 'var(--sim-text-hint)' }}>Отправьте ссылку пациенту — он увидит назначение и правила приёма</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {showNote && (
        <textarea
          value={note}
          onChange={e => setNote(e.target.value)}
          placeholder="Дополнительный комментарий для пациента (необязательно)"
          rows={2}
          className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#2d6a4f]/20"
        />
      )}
      <div className="flex gap-2">
        <button
          onClick={handleCreate}
          disabled={loading}
          className="btn btn-secondary flex-1"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
          </svg>
          {loading ? 'Создаю...' : 'Отправить назначение пациенту'}
        </button>
        {!showNote && (
          <button
            onClick={() => setShowNote(true)}
            className="px-3 py-2.5 rounded-xl text-xs text-gray-500 hover:text-gray-700 transition-colors"
            style={{ border: '1px solid var(--sim-border)' }}
            title="Добавить комментарий"
          >
            +
          </button>
        )}
      </div>
    </div>
  )
}
