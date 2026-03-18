'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { createIntakeLink, createIntakeLinkForPatient } from '@/lib/actions/intake'
import { IntakeType } from '@/types'

type Patient = { id: string; name: string }

type Props = {
  patients: Patient[]
}

type Flow = 'intake' | 'existing' | null
type ExistingStep = 'pick' | 'type' | 'link'

export default function AddPatientWidget({ patients }: Props) {
  const [flow, setFlow] = useState<Flow>(null)

  function openFlow(f: Flow) { setFlow(f) }
  function close() { setFlow(null) }

  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <WidgetButton
          icon={
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          }
          label="Первичная анкета"
          sub="Отправьте ссылку новому пациенту — заполнит дома за 15–20 мин. Данные появятся в карточке автоматически."
          onClick={() => openFlow('intake')}
        />
        <WidgetButton
          icon={
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M18 7.5v3m0 0v3m0-3h3m-3 0h-3M9 12a3 3 0 100-6 3 3 0 000 6zm-6.75 8.25a6.75 6.75 0 0113.5 0" />
            </svg>
          }
          label="Анкета из базы"
          sub="Для уже зарегистрированного пациента. ФИО предзаполнены — удобно для повторного визита или острого случая."
          onClick={() => openFlow('existing')}
          disabled={patients.length === 0}
        />
        <WidgetButton
          icon={
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
            </svg>
          }
          label="Добавить вручную"
          sub="Создайте карточку сами прямо сейчас — во время звонка или когда пациент уже пришёл на приём."
          href="/patients/new"
        />
      </div>

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
  const style = { backgroundColor: '#1a3020', color: '#f7f3ed' }

  const inner = (
    <>
      <span className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5" style={{ backgroundColor: 'rgba(125,212,168,0.15)' }}>
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block text-[13px] font-semibold leading-tight">{label}</span>
        <span className="block text-[11px] leading-snug mt-0.5" style={{ color: 'rgba(247,243,237,0.5)' }}>{sub}</span>
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
  const [intakeType, setIntakeType] = useState<IntakeType>('primary')
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
      const token = await createIntakeLinkForPatient(selectedPatient.id, intakeType)
      setLink(`${window.location.origin}/intake/${token}`)
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
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
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
            <label className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${intakeType === 'primary' ? 'border-green-400 bg-green-50' : 'border-gray-200 hover:bg-gray-50'}`}>
              <input type="radio" className="mt-0.5 accent-emerald-600" checked={intakeType === 'primary'} onChange={() => setIntakeType('primary')} />
              <div>
                <div className="text-sm font-medium text-gray-800">Первичная анкета</div>
                <div className="text-xs text-gray-500 mt-0.5">Полный опрос: жалобы, модальности, психика, сон — 10–15 минут</div>
              </div>
            </label>
            <label className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${intakeType === 'acute' ? 'border-orange-400 bg-orange-50' : 'border-gray-200 hover:bg-gray-50'}`}>
              <input type="radio" className="mt-0.5 accent-orange-500" checked={intakeType === 'acute'} onChange={() => setIntakeType('acute')} />
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
            style={{ backgroundColor: '#1a3020', color: '#f7f3ed' }}
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
        className="w-full rounded-2xl p-6 shadow-2xl"
        style={{ maxWidth: 420, backgroundColor: '#f7f3ed', border: '0.5px solid #d4c9b8' }}
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
            <h2 className="text-xl font-light" style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", color: '#1a1a0a' }}>
              {title}
            </h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors ml-2 shrink-0">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <p className="text-sm mb-5" style={{ color: '#9a8a6a' }}>{subtitle}</p>
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
        style={{ backgroundColor: '#f0ebe3', border: '1px solid #d4c9b8', color: '#5a5040' }}
      >
        {link}
      </div>
      <button
        onClick={onCopy}
        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all hover:opacity-90"
        style={{ backgroundColor: copied ? '#2d6a4f' : '#1a3020', color: '#f7f3ed' }}
      >
        {copied ? `✓ Скопировано` : `📋 Скопировать ссылку`}
      </button>
      <p className="text-xs text-center" style={{ color: '#b8a898' }}>{note}</p>
    </div>
  )
}
