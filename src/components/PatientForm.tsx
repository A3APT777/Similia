'use client'

import { Patient } from '@/types'
import { useRouter } from 'next/navigation'
import { useTransition, useState, useRef, useEffect } from 'react'
import { CONSTITUTIONAL_TYPES } from '@/lib/remedies'
import { t } from '@/lib/i18n'
import { useLanguage } from '@/hooks/useLanguage'

type Props = {
  patient?: Patient
  action: (formData: FormData) => Promise<void>
  submitLabel: string
}

const inputClass = "w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white transition-colors"
const labelClass = "block text-sm font-medium text-gray-600 mb-1"

export default function PatientForm({ patient, action, submitLabel }: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const { lang } = useLanguage()

  // Конституциональный тип с автодополнением
  const [constType, setConstType] = useState(patient?.constitutional_type || '')
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const constRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (!dropdownRef.current?.contains(e.target as Node) && e.target !== constRef.current) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function handleConstChange(value: string) {
    setConstType(value)
    const q = value.toLowerCase()
    const results = q
      ? CONSTITUTIONAL_TYPES.filter(t => t.toLowerCase().includes(q)).slice(0, 6)
      : CONSTITUTIONAL_TYPES.slice(0, 6)
    setSuggestions(results)
    setShowSuggestions(results.length > 0)
  }

  function selectConst(type: string) {
    setConstType(type)
    setShowSuggestions(false)
    constRef.current?.focus()
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    // Синхронизируем значение constitutional_type (из state) в формдату
    formData.set('constitutional_type', constType)
    startTransition(async () => { await action(formData) })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div data-tour="patient-name">
        <label className={labelClass}>{t(lang).patientForm.name} <span className="text-red-400">*</span></label>
        <input name="name" type="text" required autoFocus defaultValue={patient?.name || ''} placeholder={lang === 'ru' ? 'ФИО пациента' : 'Patient name'} className={inputClass} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div data-tour="patient-birthdate">
          <label className={labelClass}>{t(lang).patientForm.birthDate}</label>
          <input name="birth_date" type="date" defaultValue={patient?.birth_date || ''} className={inputClass} />
        </div>
        <div data-tour="patient-phone">
          <label className={labelClass}>{t(lang).patientForm.phone}</label>
          <input name="phone" type="tel" defaultValue={patient?.phone || ''} placeholder="+7 (___) ___-__-__" className={inputClass} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div data-tour="patient-email">
          <label className={labelClass}>{t(lang).patientForm.email}</label>
          <input name="email" type="email" defaultValue={patient?.email || ''} placeholder="email@example.com" className={inputClass} />
        </div>

        {/* Конституциональный тип */}
        <div data-tour="patient-constitution">
          <label className={labelClass}>
            {t(lang).patientForm.constitutionalType}
            <span className="ml-1.5 text-[10px] font-normal text-gray-400">{t(lang).patientForm.constitutionalHint}</span>
          </label>
          <div className="relative">
            <input
              ref={constRef}
              name="constitutional_type"
              type="text"
              value={constType}
              onChange={e => handleConstChange(e.target.value)}
              onFocus={() => { setSuggestions(CONSTITUTIONAL_TYPES.slice(0, 6)); setShowSuggestions(true) }}
              placeholder="Sulphur, Calcarea carbonica..."
              className={inputClass}
              autoComplete="off"
            />
            {showSuggestions && suggestions.length > 0 && (
              <div ref={dropdownRef} className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-10 overflow-hidden">
                {suggestions.map(t => (
                  <button
                    key={t}
                    type="button"
                    onMouseDown={e => { e.preventDefault(); selectConst(t) }}
                    className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-emerald-50 hover:text-emerald-700 transition-colors"
                  >
                    {t}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div data-tour="patient-note">
        <label className={labelClass}>{t(lang).patientForm.notes}</label>
        <textarea name="notes" rows={2} defaultValue={patient?.notes || ''} placeholder={lang === 'ru' ? 'Заметки о пациенте...' : 'Patient notes...'} className={inputClass + ' resize-none'} />
      </div>
      <div className="flex flex-col sm:flex-row gap-3 pt-2" data-tour="patient-submit">
        <button type="submit" disabled={pending} className="w-full sm:w-auto flex items-center justify-center gap-2 text-white px-5 py-3 rounded-lg text-sm font-medium disabled:opacity-50 transition-colors" style={{ backgroundColor: 'var(--color-primary)' }}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          {pending ? t(lang).patientForm.saving : submitLabel}
        </button>
        <button type="button" onClick={() => router.back()} className="text-sm text-gray-400 hover:text-gray-700 px-3 py-2">
          {t(lang).patientForm.cancel}
        </button>
      </div>
    </form>
  )
}
