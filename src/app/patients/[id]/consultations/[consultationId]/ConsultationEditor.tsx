'use client'

import { useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { updateConsultationNotes, updateConsultationType } from '@/lib/actions/consultations'
import { Consultation, Patient, ConsultationType } from '@/types'
import { formatDate } from '@/lib/utils'
import ComparisonPanel from './ComparisonPanel'
import TemplateMenu from './TemplateMenu'
import PrescriptionModal from './PrescriptionModal'

type Props = {
  consultation: Consultation
  patient: Patient
  previousConsultation: Consultation | null
}

const TYPE_CONFIG = {
  chronic: {
    label: 'Хронический',
    short: 'Хрон.',
    badge: 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100',
    dot: 'bg-emerald-500',
  },
  acute: {
    label: 'Острый случай',
    short: 'Острый',
    badge: 'bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100',
    dot: 'bg-orange-500',
  },
}

export default function ConsultationEditor({ consultation, patient, previousConsultation }: Props) {
  const router = useRouter()
  const [notes, setNotes] = useState(consultation.notes || '')
  const [saveState, setSaveState] = useState<'saved' | 'saving' | 'unsaved'>('saved')
  const [rightTab, setRightTab] = useState<'prev' | 'compare'>('compare')
  const [mobileTab, setMobileTab] = useState<'editor' | 'compare'>('editor')
  const [type, setType] = useState<ConsultationType>(consultation.type ?? 'chronic')
  const [showPrescription, setShowPrescription] = useState(false)
  const [, startTypeTransition] = useTransition()
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  function handleChange(value: string) {
    setNotes(value)
    setSaveState('unsaved')
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(async () => {
      setSaveState('saving')
      await updateConsultationNotes(consultation.id, value)
      setSaveState('saved')
    }, 1500)
  }

  async function handleFinish() {
    if (saveState !== 'saved') {
      clearTimeout(timerRef.current)
      await updateConsultationNotes(consultation.id, notes)
    }
    setShowPrescription(true)
  }

  function toggleType() {
    const next: ConsultationType = type === 'chronic' ? 'acute' : 'chronic'
    setType(next)
    startTypeTransition(() => {
      updateConsultationType(consultation.id, next)
    })
  }

  // Вставить шаблон в позицию курсора (или в конец)
  function insertTemplate(templateText: string) {
    const textarea = textareaRef.current
    const current = notes

    let newValue: string
    let newCursorPos: number

    if (textarea) {
      const start = textarea.selectionStart
      const before = current.slice(0, start)
      const after = current.slice(textarea.selectionEnd)

      const prefix = before && !before.endsWith('\n\n')
        ? before.endsWith('\n') ? '\n' : '\n\n'
        : ''

      newValue = before + prefix + templateText + after
      newCursorPos = before.length + prefix.length + templateText.length
    } else {
      const prefix = current && !current.endsWith('\n\n')
        ? current.endsWith('\n') ? '\n' : '\n\n'
        : ''
      newValue = current + prefix + templateText
      newCursorPos = newValue.length
    }

    handleChange(newValue)

    requestAnimationFrame(() => {
      if (textarea) {
        textarea.focus()
        textarea.setSelectionRange(newCursorPos, newCursorPos)
      }
    })
  }

  const typeCfg = TYPE_CONFIG[type]
  const wordCount = notes.trim() ? notes.trim().split(/\s+/).length : 0

  return (
    <>
    {showPrescription && (
      <PrescriptionModal
        consultationId={consultation.id}
        onSkip={() => router.push(`/patients/${consultation.patient_id}`)}
        onSaved={() => router.push(`/patients/${consultation.patient_id}`)}
      />
    )}

    {/* Мобильный таб-бар (скрыт на desktop) */}
    <div className="lg:hidden flex border-b border-gray-100 bg-white shrink-0">
      <button
        onClick={() => setMobileTab('editor')}
        className={`flex-1 py-2.5 text-xs font-semibold transition-colors border-b-2 ${
          mobileTab === 'editor'
            ? 'text-gray-900 border-emerald-500'
            : 'text-gray-400 border-transparent'
        }`}
      >
        Редактор
      </button>
      <button
        onClick={() => setMobileTab('compare')}
        className={`flex-1 py-2.5 text-xs font-semibold transition-colors border-b-2 ${
          mobileTab === 'compare'
            ? 'text-gray-900 border-emerald-500'
            : 'text-gray-400 border-transparent'
        }`}
      >
        {previousConsultation ? 'Сравнение' : 'Прошлый приём'}
      </button>
    </div>

    <div className="flex flex-col lg:grid lg:grid-cols-2 gap-0 flex-1 lg:h-[calc(100vh-54px)]">

      {/* ══════════ Левая колонка: редактор ══════════ */}
      <div className={`${mobileTab === 'editor' ? 'flex' : 'hidden'} lg:flex flex-col border-r border-gray-100 min-h-0`}>

        {/* Шапка */}
        <div className="px-6 py-3.5 border-b border-gray-100 bg-white">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className={`w-2 h-2 rounded-full shrink-0 ${typeCfg.dot}`} />
              <div className="min-w-0">
                <h1 className="text-sm font-semibold text-gray-900 tracking-tight truncate">{patient.name}</h1>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-xs text-gray-400">{formatDate(consultation.date)}</span>
                  {patient.phone && <span className="text-gray-200 text-xs hidden sm:inline">·</span>}
                  {patient.phone && <span className="text-xs text-gray-400 hidden sm:inline">{patient.phone}</span>}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <div className="text-xs">
                {saveState === 'saved' && notes.trim().length > 0 && (
                  <span className="flex items-center gap-1 text-emerald-500">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    Сохранено
                  </span>
                )}
                {saveState === 'saving' && <span className="text-gray-400">Сохраняю...</span>}
                {saveState === 'unsaved' && <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" />}
              </div>

              <button
                onClick={handleFinish}
                className="bg-emerald-600 text-white text-xs px-4 py-2 rounded-lg hover:bg-emerald-700 transition-colors font-semibold shadow-sm shadow-emerald-900/10"
              >
                Закончить приём
              </button>
            </div>
          </div>
        </div>

        {/* Тулбар: тип + шаблоны + счётчик */}
        <div className="px-5 py-2 border-b border-gray-100 bg-white flex items-center gap-3">
          {/* Переключатель типа консультации */}
          <button
            type="button"
            onClick={toggleType}
            title="Нажмите, чтобы изменить тип"
            className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all ${typeCfg.badge}`}
          >
            {type === 'chronic' ? (
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
              </svg>
            ) : (
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
              </svg>
            )}
            {typeCfg.label}
          </button>

          <div className="w-px h-4 bg-gray-200" />

          <TemplateMenu onInsert={insertTemplate} consultationType={type} />

          <span className="text-xs text-gray-300 ml-auto">
            {wordCount > 0 ? `${wordCount} слов` : 'Пустая заметка'}
          </span>
        </div>

        {/* Textarea */}
        <textarea
          ref={textareaRef}
          value={notes}
          onChange={e => handleChange(e.target.value)}
          autoFocus
          placeholder={
            type === 'acute'
              ? `Острый случай — начните писать или выберите шаблон...\n\nЖАЛОБЫ ОСТРОГО СОСТОЯНИЯ\n—\n\nМОДАЛЬНОСТИ\nХуже от:\nЛучше от:\n\nНАЗНАЧЕНИЕ\nПрепарат:\nПотенция:`
              : `Хроническая консультация — начните писать или выберите шаблон...\n\nЖАЛОБЫ\n—\n\nМОДАЛЬНОСТИ\nХуже от:\nЛучше от:\n\nПСИХОЭМОЦИОНАЛЬНОЕ\nНастроение:`
          }
          className="flex-1 w-full px-5 lg:px-7 py-5 lg:py-6 text-[13.5px] text-gray-800 leading-[1.75] resize-none focus:outline-none bg-white placeholder-gray-300 font-mono min-h-[60vh] lg:min-h-0"
        />
      </div>

      {/* ══════════ Правая колонка ══════════ */}
      <div className={`${mobileTab === 'compare' ? 'flex' : 'hidden'} lg:flex flex-col bg-[#fafafa] min-h-0`}>
        <div className="px-5 py-2.5 border-b border-gray-100 bg-white flex items-center justify-between">
          <div className="flex items-center gap-0.5 bg-gray-100 rounded-lg p-0.5">
            <button
              onClick={() => setRightTab('compare')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                rightTab === 'compare' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              Сравнение
            </button>
            <button
              onClick={() => setRightTab('prev')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                rightTab === 'prev' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              Прошлый приём
            </button>
          </div>
          {previousConsultation && (
            <p className="text-xs text-gray-400">{formatDate(previousConsultation.date)}</p>
          )}
        </div>

        <div className="flex-1 overflow-y-auto">
          {!previousConsultation ? (
            <div className="flex flex-col items-center justify-center h-full py-16 text-center px-6">
              <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center mb-3">
                <svg className="w-5 h-5 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
                </svg>
              </div>
              <p className="text-sm text-gray-400">Это первая консультация</p>
              <p className="text-xs text-gray-300 mt-1">Не с чем сравнивать</p>
            </div>
          ) : rightTab === 'compare' ? (
            <ComparisonPanel currentNotes={notes} previousNotes={previousConsultation.notes || ''} />
          ) : (
            <div className="px-6 py-5">
              {previousConsultation.notes ? (
                <pre className="text-sm text-gray-500 leading-relaxed whitespace-pre-wrap font-mono">
                  {previousConsultation.notes}
                </pre>
              ) : (
                <p className="text-sm text-gray-300 italic">Заметки не добавлены</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
    </>
  )
}
