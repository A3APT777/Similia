'use client'

import { useState } from 'react'
import { createIntakeLink } from '@/lib/actions/intake'
import { IntakeType } from '@/types'

type Props = {
  patientId: string
  patientName: string
  type?: IntakeType
  hasCompleted?: boolean
}

export default function IntakeLinkButton({
  patientId,
  patientName,
  type = 'primary',
  hasCompleted = false,
}: Props) {
  const [link, setLink] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  const isAcute = type === 'acute'

  async function handleCreate() {
    setLoading(true)
    const token = await createIntakeLink(type)
    setLink(`${window.location.origin}/intake/${token}`)
    setLoading(false)
  }

  async function handleCopy() {
    if (!link) return
    await navigator.clipboard.writeText(link)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (!link) {
    const baseClass = isAcute
      ? 'border-orange-200 text-orange-700 hover:bg-orange-50 hover:border-orange-400'
      : 'border-violet-200 text-violet-700 hover:bg-violet-50 hover:border-violet-400'

    return (
      <button
        onClick={handleCreate}
        disabled={loading}
        className={`text-sm border px-4 py-2.5 rounded-lg transition-all disabled:opacity-50 ${baseClass}`}
      >
        {loading ? 'Создаю...' : isAcute ? '⚡ Анкета острого случая' : hasCompleted ? 'Новая анкета' : '📋 Отправить анкету'}
      </button>
    )
  }

  const accentClass = isAcute
    ? 'bg-orange-50 border-orange-200'
    : 'bg-violet-50 border-violet-200'
  const labelClass = isAcute ? 'text-orange-700' : 'text-violet-700'
  const urlClass = isAcute ? 'border-orange-200 text-orange-600' : 'border-violet-200 text-violet-600'
  const copyBtnClass = isAcute ? 'bg-orange-500 border-orange-500 hover:bg-orange-600' : 'bg-violet-600 border-violet-600 hover:bg-violet-700'
  const hintClass = isAcute ? 'text-orange-400' : 'text-violet-400'

  return (
    <div className={`border rounded-xl px-4 py-3 space-y-2 ${accentClass}`}>
      <p className={`text-xs font-semibold ${labelClass}`}>
        {isAcute ? '⚡ Ссылка — острый случай:' : 'Ссылка для пациента:'}
      </p>
      <div className="flex items-center gap-2">
        <p className={`text-xs truncate flex-1 bg-white border rounded-lg px-3 py-1.5 font-mono ${urlClass}`}>
          {link}
        </p>
        <button
          onClick={handleCopy}
          className={`shrink-0 text-xs font-semibold px-3 py-1.5 rounded-lg border text-white transition-all ${
            copied ? 'bg-emerald-600 border-emerald-600' : copyBtnClass
          }`}
        >
          {copied ? '✓ Скопировано' : 'Копировать'}
        </button>
      </div>
      <p className={`text-[10px] ${hintClass}`}>Отправьте ссылку пациенту в WhatsApp, Telegram или по почте</p>
    </div>
  )
}
