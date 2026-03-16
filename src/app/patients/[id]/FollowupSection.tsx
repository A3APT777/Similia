'use client'

import { useState } from 'react'
import { createFollowup } from '@/lib/actions/followups'
import { Followup } from '@/types'
import { t } from '@/lib/i18n'
import { useLanguage } from '@/hooks/useLanguage'

const statusColor: Record<string, string> = {
  better: 'bg-green-50 text-green-700',
  same: 'bg-gray-50 text-gray-600',
  worse: 'bg-red-50 text-red-600',
  new_symptoms: 'bg-orange-50 text-orange-600',
}

type Props = {
  latestConsultationId: string
  patientId: string
  existingFollowup: Followup | null
}

export default function FollowupSection({ latestConsultationId, patientId, existingFollowup }: Props) {
  const { lang } = useLanguage()
  const [followup, setFollowup] = useState<Followup | null>(existingFollowup)
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  async function handleCreate() {
    setLoading(true)
    try {
      const { token } = await createFollowup(latestConsultationId, patientId)
      setFollowup({ token } as Followup)
    } finally {
      setLoading(false)
    }
  }

  async function copyLink() {
    if (!followup) return
    const url = `${window.location.origin}/followup/${followup.token}`
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Если есть ответ — показываем результат
  if (followup?.responded_at && followup.status) {
    return (
      <div className={`rounded-xl px-5 py-4 mb-6 ${statusColor[followup.status]}`}>
        <p className="text-sm font-medium">{t(lang).followup.feeling} {t(lang).followup.statusLabels[followup.status]}</p>
        {followup.comment && (
          <p className="text-sm mt-1 opacity-80">{followup.comment}</p>
        )}
      </div>
    )
  }

  // Если ссылка уже создана — показываем её
  if (followup?.token) {
    const url = typeof window !== 'undefined'
      ? `${window.location.origin}/followup/${followup.token}`
      : `/followup/${followup.token}`

    return (
      <div className="bg-green-50 border border-green-200 rounded-xl px-5 py-4 mb-6">
        <p className="text-sm text-green-800 font-medium mb-2">{t(lang).followup.linkReady}</p>
        <div className="flex items-center gap-2">
          <code className="text-xs text-green-700 bg-[#faf7f2] border border-green-100 rounded px-2 py-1 flex-1 truncate">
            {`${typeof window !== 'undefined' ? window.location.origin : ''}/followup/${followup.token}`}
          </code>
          <button
            onClick={copyLink}
            className="text-xs bg-green-700 text-white px-3 py-1.5 rounded-lg hover:bg-green-800 transition-colors shrink-0"
          >
            {copied ? t(lang).followup.copied : t(lang).followup.copy}
          </button>
        </div>
        <p className="text-xs text-green-500 mt-2">{t(lang).followup.sendHint}</p>
      </div>
    )
  }

  // Кнопка создания follow-up
  return (
    <div className="mb-6">
      <button
        onClick={handleCreate}
        disabled={loading}
        className="text-sm text-gray-500 border border-gray-200 px-4 py-2 rounded-lg hover:border-gray-300 hover:text-gray-700 disabled:opacity-50 transition-all"
      >
        {loading ? t(lang).followup.creating : t(lang).followup.askFeeling}
      </button>
    </div>
  )
}
