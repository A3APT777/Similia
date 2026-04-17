'use client'

import { useState } from 'react'
import { createFollowup } from '@/lib/actions/followups'
import { Followup } from '@/types'
import { t } from '@/lib/shared/i18n'
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
    return (
      <div className="rounded-xl px-4 py-3 space-y-2 mb-6" style={{ backgroundColor: 'rgba(45,106,79,0.04)', border: '1px solid rgba(45,106,79,0.15)' }}>
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em]" style={{ color: 'var(--sim-green)' }}>{t(lang).followup.linkReady}</p>
        <div className="flex items-center gap-2">
          <p className="text-xs truncate flex-1 rounded-full px-3 py-1.5 font-mono" style={{ backgroundColor: 'var(--sim-bg-card)', border: '1px solid var(--sim-border)', color: 'var(--sim-text-muted)' }}>
            {typeof window !== 'undefined' ? `${window.location.origin}/followup/${followup.token}` : ''}
          </p>
          <button onClick={copyLink} className="btn btn-primary text-xs shrink-0">
            {copied ? '✓' : t(lang).followup.copy}
          </button>
        </div>
        <p className="text-[11px]" style={{ color: 'var(--sim-text-muted)', lineHeight: 1.5 }}>Скопируйте и отправьте пациенту. Он оценит самочувствие по шкале 1-10 и опишет изменения. Ответ появится в карточке.</p>
      </div>
    )
  }

  // Кнопка создания follow-up
  return (
    <div className="mb-6">
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
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
        </svg>
        <span className="truncate">{loading ? t(lang).followup.creating : (lang === 'ru' ? 'Спросить самочувствие' : 'Ask how they feel')}</span>
      </button>
    </div>
  )
}
