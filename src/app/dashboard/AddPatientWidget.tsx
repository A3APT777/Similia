'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { createIntakeLink, createIntakeLinkForPatient } from '@/lib/actions/intake'
import { createPreVisitSurvey } from '@/lib/actions/surveys'
import { IntakeType, type PatientPreview } from '@/types'

type Props = {
  patients: PatientPreview[]
}

type Flow = 'intake' | 'existing' | null
type ExistingStep = 'pick' | 'type' | 'link'

export default function AddPatientWidget({ patients }: Props) {
  const [flow, setFlow] = useState<Flow>(null)

  function openFlow(f: Flow) { setFlow(f) }
  function close() { setFlow(null) }

  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div className="relative">
      {/* Одна кнопка */}
      <button
        onClick={() => setMenuOpen(!menuOpen)}
        className="btn btn-primary w-full sm:w-auto"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
        </svg>
        Добавить пациента
        <svg className={`w-3 h-3 transition-transform ${menuOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown */}
      {menuOpen && (
        <div
          className="absolute top-full left-0 mt-2 w-full sm:w-80 rounded-xl shadow-lg z-50 overflow-hidden"
          style={{ backgroundColor: 'var(--sim-bg-card)', border: '1px solid var(--sim-border)' }}
        >
          <button
            onClick={() => { setMenuOpen(false); openFlow('intake') }}
            className="w-full text-left px-4 py-3 transition-colors hover:bg-(--sim-bg-muted)"
          >
            <p className="text-sm font-medium" style={{ color: 'var(--sim-text)' }}>Отправить анкету новому</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--sim-text-hint)' }}>Пациент заполнит дома — данные появятся в карточке</p>
          </button>
          <button
            onClick={() => { setMenuOpen(false); openFlow('existing') }}
            disabled={patients.length === 0}
            className="w-full text-left px-4 py-3 transition-colors hover:bg-(--sim-bg-muted) disabled:opacity-40"
            style={{ borderTop: '1px solid var(--sim-border)' }}
          >
            <p className="text-sm font-medium" style={{ color: 'var(--sim-text)' }}>Опросник существующему</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--sim-text-hint)' }}>Предконсультационный опросник для повторного визита</p>
          </button>
          <Link
            href="/patients/new"
            onClick={() => setMenuOpen(false)}
            className="block w-full text-left px-4 py-3 transition-colors hover:bg-(--sim-bg-muted)"
            style={{ borderTop: '1px solid var(--sim-border)' }}
          >
            <p className="text-sm font-medium" style={{ color: 'var(--sim-text)' }}>Заполнить вручную</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--sim-text-hint)' }}>Создать карточку самому — при звонке или на приёме</p>
          </Link>
        </div>
      )}

      {/* Закрыть при клике вне */}
      {menuOpen && <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />}

      {flow === 'intake' && <PrimaryIntakeModal onClose={close} />}
      {flow === 'existing' && <ExistingPatientModal patients={patients} onClose={close} />}
    </div>
  )
}

// ── Кнопка виджета ─────────────────────────────────────────────────────────────

function WidgetButton({
  icon, label, sub, onClick, href, disabled,
}: {
  icon: React.ReactNode
  label: string
  sub: string
  onClick?: () => void
  href?: string
  disabled?: boolean
}) {
  const cls = `flex items-start gap-3 w-full text-left px-3 py-3 rounded-xl transition-all hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed`
  const style = { backgroundColor: 'var(--sim-forest)', color: '#f7f3ed' }

  const inner = (
    <>
      <span className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5" style={{ backgroundColor: 'rgba(125,212,168,0.15)' }}>
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block text-[13px] font-semibold leading-tight">{label}</span>
        <span className="block text-xs leading-snug mt-0.5" style={{ color: 'rgba(247,243,237,0.5)' }}>{sub}</span>
      </span>
    </>
  )

  if (href) {
    return <Link href={href} className={cls} style={style}>{inner}</Link>
  }
  return (
    <button onClick={onClick} disabled={disabled} className={cls} style={style}>
      {inner}
    </button>
  )
}

// ── Модалка: Первичная анкета ─────────────────────────────────────────────────

function PrimaryIntakeModal({ onClose }: { onClose: () => void }) {
  const [link, setLink] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  useEffect(() => {
    async function generate() {
      setLoading(true)
      try {
        const token = await createIntakeLink('primary')
        setLink(`${window.location.origin}/intake/${token}`)
      } finally {
        setLoading(false)
      }
    }
    generate()
  }, [])

  async function handleCopy() {
    if (!link) return
    await navigator.clipboard.writeText(link)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Modal
      onClose={onClose}
      title="Первичная анкета"
      subtitle="Пациент заполняет полный опрос — жалобы, модальности, психика, история здоровья. В конце может записаться на приём."
    >
      {loading && (
        <div className="flex justify-center py-6">
          <span className="w-5 h-5 border-2 border-gray-200 border-t-gray-600 rounded-full animate-spin" />
        </div>
      )}
      {link && (
        <LinkResult link={link} copied={copied} onCopy={handleCopy} note="Ссылка действует 24 часа · 15–20 минут на заполнение" />
      )}
    </Modal>
  )
}

// ── Модалка: Из базы ───────────────────────────────────────────────────────────

function ExistingPatientModal({ patients, onClose }: { patients: Patient[]; onClose: () => void }) {
  const [step, setStep] = useState<ExistingStep>('pick')
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null)
  const [formType, setFormType] = useState<'survey' | 'acute'>('survey')
  const [link, setLink] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [search, setSearch] = useState('')

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const filtered = useMemo(() =>
    patients.filter(p => p.name.toLowerCase().includes(search.toLowerCase())),
    [patients, search]
  )

  function selectPatient(p: Patient) {
    setSelectedPatient(p)
    setStep('type')
  }

  async function generateLink() {
    if (!selectedPatient) return
    setLoading(true)
    try {
      if (formType === 'survey') {
        const { token } = await createPreVisitSurvey(selectedPatient.id)
        setLink(`${window.location.origin}/survey/${token}`)
      } else {
        const token = await createIntakeLinkForPatient(selectedPatient.id, 'acute')
        setLink(`${window.location.origin}/intake/${token}`)
      }
      setStep('link')
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

  return (
    <Modal
      onClose={onClose}
      title={step === 'pick' ? 'Выберите пациента' : step === 'type' ? selectedPatient?.name ?? '' : 'Ссылка готова'}
      subtitle={
        step === 'pick' ? 'Данные ФИО и телефон будут заполнены автоматически' :
        step === 'type' ? 'Выберите тип анкеты' :
        'Отправьте пациенту — его данные уже заполнены'
      }
      onBack={step !== 'pick' ? () => { setStep(step === 'link' ? 'type' : 'pick'); setLink(null) } : undefined}
    >
      {step === 'pick' && (
        <div className="space-y-2">
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Поиск по имени..."
            autoFocus
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2d6a4f]/25"
          />
          <div className="max-h-52 overflow-y-auto space-y-1">
            {filtered.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-4">Пациенты не найдены</p>
            )}
            {filtered.map(p => (
              <button
                key={p.id}
                onClick={() => selectPatient(p)}
                className="w-full text-left px-3 py-2 rounded-lg text-sm text-gray-800 hover:bg-gray-50 transition-colors"
              >
                {p.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {step === 'type' && (
        <div className="space-y-3">
          <div className="space-y-2">
            <label className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${formType === 'survey' ? 'border-[#2d6a4f] bg-[rgba(45,106,79,0.05)]' : 'border-gray-200 hover:bg-gray-50'}`}>
              <input type="radio" className="mt-0.5 accent-[#2d6a4f]" checked={formType === 'survey'} onChange={() => setFormType('survey')} />
              <div>
                <div className="text-sm font-medium text-gray-800">Опросник перед визитом</div>
                <div className="text-xs text-gray-500 mt-0.5">Реакция на препарат, динамика, сон, аппетит — 10–15 минут</div>
              </div>
            </label>
            <label className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${formType === 'acute' ? 'border-orange-400 bg-orange-50' : 'border-gray-200 hover:bg-gray-50'}`}>
              <input type="radio" className="mt-0.5 accent-orange-500" checked={formType === 'acute'} onChange={() => setFormType('acute')} />
              <div>
                <div className="text-sm font-medium text-gray-800">⚡ Острый случай</div>
                <div className="text-xs text-gray-500 mt-0.5">Короткая анкета острого состояния — 5–7 минут</div>
              </div>
            </label>
          </div>
          <button
            onClick={generateLink}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all hover:opacity-90 disabled:opacity-60"
            style={{ backgroundColor: 'var(--sim-forest)', color: '#f7f3ed' }}
          >
            {loading ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : null}
            {loading ? 'Создаю ссылку...' : 'Создать ссылку →'}
          </button>
        </div>
      )}

      {step === 'link' && link && (
        <LinkResult link={link} copied={copied} onCopy={handleCopy} note="Ссылка действует 24 часа · данные пациента предзаполнены" />
      )}
    </Modal>
  )
}

// ── Общие вспомогательные компоненты ──────────────────────────────────────────

function Modal({ title, subtitle, children, onClose, onBack }: {
  title: string
  subtitle: string
  children: React.ReactNode
  onClose: () => void
  onBack?: () => void
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="w-full rounded-xl p-6 shadow-2xl"
        style={{ maxWidth: 420, backgroundColor: 'var(--sim-bg)', border: '0.5px solid var(--sim-border)' }}
      >
        <div className="flex items-start justify-between mb-1">
          <div className="flex items-center gap-2">
            {onBack && (
              <button onClick={onBack} className="text-gray-400 hover:text-gray-600 transition-colors">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            )}
            <h2 className="text-xl font-light" style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", color: 'var(--sim-text)' }}>
              {title}
            </h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors ml-2 shrink-0">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <p className="text-sm mb-5" style={{ color: 'var(--sim-text-hint)' }}>{subtitle}</p>
        {children}
      </div>
    </div>
  )
}

function LinkResult({ link, copied, onCopy, note }: {
  link: string
  copied: boolean
  onCopy: () => void
  note: string
}) {
  return (
    <div className="space-y-3">
      <div
        className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-mono break-all"
        style={{ backgroundColor: 'var(--sim-bg, #faf8f5)', border: '1px solid var(--sim-border)', color: 'var(--sim-text-sec)' }}
      >
        {link}
      </div>
      <button
        onClick={onCopy}
        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all hover:opacity-90"
        style={{ backgroundColor: copied ? 'var(--sim-green)' : 'var(--sim-forest)', color: '#f7f3ed' }}
      >
        {copied ? `✓ Скопировано` : `📋 Скопировать ссылку`}
      </button>
      <p className="text-xs text-center" style={{ color: '#b8a898' }}>{note}</p>
    </div>
  )
}
