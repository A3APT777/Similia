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
      <div className="space-y-2">
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
        <p className="text-xs text-gray-400">Отправьте ссылку пациенту {patientName}</p>
      </div>
    )
  }

  return (
    <button
      onClick={handleCreate}
      disabled={loading}
      className="btn btn-secondary w-full"
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
      {loading ? 'Создаю...' : 'Подробный опросник (15 мин)'}
    </button>
  )
}
