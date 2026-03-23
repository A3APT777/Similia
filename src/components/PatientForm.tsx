'use client'

import { Patient } from '@/types'
import { useRouter } from 'next/navigation'
import { useTransition, useState, useRef, useEffect, useCallback } from 'react'
import { CONSTITUTIONAL_TYPES } from '@/lib/remedies'
import { searchRemedyNames } from '@/lib/actions/repertory'
import { t } from '@/lib/i18n'
import { useLanguage } from '@/hooks/useLanguage'

type Props = {
  patient?: Patient
  action: (formData: FormData) => Promise<void>
  submitLabel: string
}

const inputClass = "w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2d6a4f]/30 bg-white transition-colors"
const labelClass = "block text-sm font-medium text-gray-700 mb-1"

export default function PatientForm({ patient, action, submitLabel }: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const { lang } = useLanguage()
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [isDirty, setIsDirty] = useState(false)

  // Конституциональный тип с автодополнением
  const [constType, setConstType] = useState(patient?.constitutional_type || '')
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const constRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Предупреждение при закрытии с несохранёнными данными
  const handleBeforeUnload = useCallback((e: BeforeUnloadEvent) => {
    if (isDirty && !pending) {
      e.preventDefault()
    }
  }, [isDirty, pending])

  useEffect(() => {
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [handleBeforeUnload])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (!dropdownRef.current?.contains(e.target as Node) && e.target !== constRef.current) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  // Транслитерация кириллицы → латиница
  function cyrToLat(text: string): string {
    const map: Record<string, string> = {
      'а':'a','б':'b','в':'v','г':'g','д':'d','е':'e','ё':'yo','ж':'zh','з':'z',
      'и':'i','й':'j','к':'c','л':'l','м':'m','н':'n','о':'o','п':'p','р':'r',
      'с':'s','т':'t','у':'u','ф':'f','х':'h','ц':'c','ч':'ch','ш':'sh',
      'щ':'sch','э':'e','ю':'yu','я':'ya',
    }
    return text.toLowerCase().split('').map(c => map[c] ?? c).join('')
  }

  function handleConstChange(value: string) {
    setConstType(value)
    setIsDirty(true)
    if (debounceRef.current) clearTimeout(debounceRef.current)

    if (!value.trim()) {
      setSuggestions(CONSTITUTIONAL_TYPES.slice(0, 6))
      setShowSuggestions(true)
      return
    }

    const hasCyrillic = /[а-яёА-ЯЁ]/.test(value)
    const searchQ = hasCyrillic ? cyrToLat(value) : value.toLowerCase()

    const local = CONSTITUTIONAL_TYPES.filter(item => item.toLowerCase().includes(searchQ)).slice(0, 6)
    setSuggestions(local)
    setShowSuggestions(true)

    if (value.trim().length < 2) return

    debounceRef.current = setTimeout(async () => {
      const results = await searchRemedyNames(searchQ)
      if (results.length > 0) {
        setSuggestions(results.map(r => r.name))
        setShowSuggestions(true)
      }
    }, 350)
  }

  function selectConst(type: string) {
    setConstType(type)
    setShowSuggestions(false)
    constRef.current?.focus()
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    formData.set('constitutional_type', constType)
    setSubmitError(null)
    setIsDirty(false)
    startTransition(async () => {
      try {
        await action(formData)
      } catch (err) {
        if (err instanceof Error && !err.message.includes('NEXT_REDIRECT')) {
          setSubmitError(err.message || (lang === 'ru' ? 'Ошибка при сохранении' : 'Save error'))
          setIsDirty(true)
        } else {
          throw err
        }
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} onChange={() => setIsDirty(true)} className="space-y-4">
      <div data-tour="patient-name">
        <label htmlFor="pf-name" className={labelClass}>{t(lang).patientForm.name} <span className="text-red-400">*</span></label>
        <input id="pf-name" name="name" type="text" required autoFocus defaultValue={patient?.name || ''} placeholder={lang === 'ru' ? 'ФИО пациента' : 'Patient name'} className={inputClass} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div data-tour="patient-birthdate">
          <label htmlFor="pf-birth" className={labelClass}>{t(lang).patientForm.birthDate}</label>
          <input id="pf-birth" name="birth_date" type="date" defaultValue={patient?.birth_date || ''} className={inputClass} />
        </div>
        <div>
          <label htmlFor="pf-gender" className={labelClass}>{lang === 'ru' ? 'Пол' : 'Gender'}</label>
          <select id="pf-gender" name="gender" defaultValue={patient?.gender || ''} className={inputClass}>
            <option value="">{lang === 'ru' ? 'Не указан' : 'Not specified'}</option>
            <option value="female">{lang === 'ru' ? 'Женский' : 'Female'}</option>
            <option value="male">{lang === 'ru' ? 'Мужской' : 'Male'}</option>
            <option value="other">{lang === 'ru' ? 'Другой' : 'Other'}</option>
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div data-tour="patient-phone">
          <label htmlFor="pf-phone" className={labelClass}>{t(lang).patientForm.phone}</label>
          <input id="pf-phone" name="phone" type="tel" defaultValue={patient?.phone || ''} placeholder="+7 (___) ___-__-__" className={inputClass} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div data-tour="patient-email">
          <label htmlFor="pf-email" className={labelClass}>{t(lang).patientForm.email}</label>
          <input id="pf-email" name="email" type="email" defaultValue={patient?.email || ''} placeholder="email@example.com" className={inputClass} />
        </div>

        {/* Конституциональный тип */}
        <div data-tour="patient-constitution">
          <label htmlFor="pf-constitution" className={labelClass}>
            {t(lang).patientForm.constitutionalType}
            <span className="ml-1.5 text-xs font-normal text-gray-500">{t(lang).patientForm.constitutionalHint}</span>
          </label>
          <div className="relative">
            <input
              id="pf-constitution"
              ref={constRef}
              name="constitutional_type"
              type="text"
              value={constType}
              onChange={e => handleConstChange(e.target.value)}
              onFocus={() => { setSuggestions(CONSTITUTIONAL_TYPES.slice(0, 6)); setShowSuggestions(true) }}
              placeholder={lang === 'ru' ? 'Сульфур, Калькарея карбоника...' : 'Sulphur, Calcarea carbonica...'}
              className={inputClass}
              autoComplete="off"
            />
            {showSuggestions && suggestions.length > 0 && (
              <div ref={dropdownRef} className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-2xl shadow-lg overflow-hidden" style={{ zIndex: 100002 }}>
                {suggestions.map(s => (
                  <button
                    key={s}
                    type="button"
                    onMouseDown={e => { e.preventDefault(); selectConst(s) }}
                    className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-emerald-50 hover:text-emerald-700 transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div data-tour="patient-note">
        <label htmlFor="pf-notes" className={labelClass}>{t(lang).patientForm.notes}</label>
        <textarea id="pf-notes" name="notes" rows={2} defaultValue={patient?.notes || ''} placeholder={lang === 'ru' ? 'Заметки о пациенте...' : 'Patient notes...'} className={inputClass + ' resize-none'} />
      </div>
      {submitError && (
        <div role="alert" className="rounded-lg px-4 py-2.5 text-sm text-red-700 bg-red-50 border border-red-200">{submitError}</div>
      )}
      <div className="flex flex-col sm:flex-row gap-3 pt-2" data-tour="patient-submit">
        <button type="submit" disabled={pending} className="w-full sm:w-auto flex items-center justify-center gap-2 text-white px-5 py-3 rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors" style={{ backgroundColor: 'var(--color-primary)' }}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          {pending ? t(lang).patientForm.saving : submitLabel}
        </button>
        <button type="button" onClick={() => router.back()} className="text-sm text-gray-600 hover:text-gray-900 px-4 py-3 rounded-lg transition-colors">
          {t(lang).patientForm.cancel}
        </button>
      </div>
    </form>
  )
}
