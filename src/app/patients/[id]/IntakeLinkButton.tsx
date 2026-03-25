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
      <button
        onClick={handleSendLink}
        disabled={loadingLink}
        className="w-full flex items-center gap-2 px-4 py-3 rounded-full text-[13px] font-medium transition-all"
        style={{
          backgroundColor: 'var(--sim-bg-card)',
          border: '1px solid var(--sim-border)',
          color: 'var(--sim-text)',
        }}
      >
        <svg className="w-4 h-4 shrink-0" style={{ color: isAcute ? '#ea580c' : 'var(--sim-green)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
        </svg>
        <span className="truncate">
          {loadingLink ? 'Создаю...' : isAcute ? 'Анкета острого случая' : 'Отправить анкету'}
        </span>
      </button>
    )
  }

  return (
    <div data-tour="intake-link-result" className="border rounded-xl px-4 py-3 space-y-2" style={{ backgroundColor: 'var(--color-muted-bg)', borderColor: isAcute ? 'rgba(200,160,53,0.3)' : 'var(--color-border-light)' }}>
      <p className="text-xs font-semibold" style={{ color: isAcute ? 'var(--color-amber)' : 'var(--color-primary)' }}>
        {isAcute ? `⚡ ${t(lang).intake.acuteLink}` : t(lang).intake.patientLink}
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
