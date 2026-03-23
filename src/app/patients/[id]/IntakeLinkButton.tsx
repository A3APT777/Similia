'use client'

import { useState } from 'react'
import { createIntakeLinkForPatient } from '@/lib/actions/intake'
import { IntakeType } from '@/types'
import { t } from '@/lib/i18n'
import { useLanguage } from '@/hooks/useLanguage'

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
  const { lang } = useLanguage()
  const [link, setLink] = useState<string | null>(null)
  const [loadingLink, setLoadingLink] = useState(false)
  const [copied, setCopied] = useState(false)

  const isAcute = type === 'acute'
  const isMemo = type === 'memo'

  async function getToken() {
    return await createIntakeLinkForPatient(patientId, type)
  }

  async function handleSendLink() {
    setLoadingLink(true)
    try {
      const token = await getToken()
      setLink(`${window.location.origin}/intake/${token}`)
    } finally {
      setLoadingLink(false)
    }
  }

  async function handleCopy() {
    if (!link) return
    await navigator.clipboard.writeText(link)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const borderColor = isAcute ? 'var(--color-amber)' : 'var(--color-primary)'
  const textColor = isAcute ? 'var(--color-amber)' : 'var(--color-primary)'
  const hoverBg = isAcute ? 'rgba(200,160,53,0.08)' : 'rgba(45,106,79,0.06)'

  if (!link) {
    return (
      <div className="flex items-center gap-2 flex-wrap">
        {/* Отправить пациенту — ссылка */}
        <button
          onClick={handleSendLink}
          disabled={loadingLink}
          className="btn btn-secondary w-full"
        >
          {loadingLink
            ? t(lang).intake.creating
            : isMemo
              ? '📝 Памятка к консультации'
              : isAcute
                ? `⚡ ${t(lang).intake.acuteIntake}`
                : hasCompleted
                  ? t(lang).intake.newIntake
                  : `📋 ${t(lang).intake.sendBtn}`}
        </button>
      </div>
    )
  }

  return (
    <div data-tour="intake-link-result" className="border rounded-2xl px-4 py-3 space-y-2" style={{ backgroundColor: 'var(--color-muted-bg)', borderColor: isAcute ? 'rgba(200,160,53,0.3)' : 'var(--color-border-light)' }}>
      <p className="text-xs font-semibold" style={{ color: isAcute ? 'var(--color-amber)' : 'var(--color-primary)' }}>
        {isMemo ? '📝 Памятка к консультации' : isAcute ? `⚡ ${t(lang).intake.acuteLink}` : t(lang).intake.patientLink}
      </p>
      <div className="flex items-center gap-2">
        <p
          className="text-xs truncate flex-1 rounded-lg px-3 py-1.5 font-mono"
          style={{ backgroundColor: 'var(--color-input-bg)', border: '1px solid var(--color-border)', color: 'var(--sim-text-sec)' }}
        >
          {link}
        </p>
        <button
          onClick={handleCopy}
          className="shrink-0 text-xs font-semibold px-3 py-1.5 rounded-lg border text-white transition-all"
          style={{ backgroundColor: copied ? '#2d7a50' : 'var(--color-primary)', borderColor: copied ? '#2d7a50' : 'var(--color-primary)' }}
        >
          {copied ? `✓ ${t(lang).intake.copied}` : t(lang).intake.copy}
        </button>
      </div>
      <p className="text-xs" style={{ color: 'var(--sim-text-hint)' }}>{t(lang).intake.sendHint}</p>
    </div>
  )
}
