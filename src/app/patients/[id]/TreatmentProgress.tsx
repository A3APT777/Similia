'use client'

import { useState } from 'react'
import { Consultation, Followup, DoctorDynamics } from '@/types'
import { t } from '@/lib/i18n'
import { useLanguage } from '@/hooks/useLanguage'
import { saveDoctorDynamics } from '@/lib/actions/consultations'

type Props = {
  consultations: Consultation[]
  followupByConsultation: Record<string, Followup>
}

const STATUS_STYLE: Record<string, { labelKey: string; color: string }> = {
  better:       { labelKey: 'improvement',    color: 'text-green-700 bg-green-50 border-green-200' },
  same:         { labelKey: 'noChange',       color: 'text-gray-600 bg-gray-50 border-gray-200' },
  worse:        { labelKey: 'worsening',      color: 'text-red-600 bg-red-50 border-red-200' },
  new_symptoms: { labelKey: 'newSymptoms',    color: 'text-orange-600 bg-orange-50 border-orange-200' },
}

const DYNAMICS_STYLE: Record<DoctorDynamics, { label: string; labelEn: string; color: string }> = {
  improving:    { label: '↑ Улучшение',     labelEn: '↑ Improving',   color: 'text-green-700 bg-green-50 border-green-200' },
  aggravation:  { label: '⚡ Обострение',   labelEn: '⚡ Aggravation', color: 'text-amber-700 bg-amber-50 border-amber-200' },
  no_change:    { label: '→ Без изменений', labelEn: '→ No change',   color: 'text-gray-600 bg-gray-50 border-gray-200' },
  worsening:    { label: '↓ Ухудшение',     labelEn: '↓ Worsening',   color: 'text-red-600 bg-red-50 border-red-200' },
  deterioration:{ label: '✕ Без реакции',   labelEn: '✕ No reaction', color: 'text-orange-700 bg-orange-50 border-orange-200' },
}

const DYNAMICS_OPTIONS: { value: DoctorDynamics; icon: string; labelRu: string }[] = [
  { value: 'improving',     icon: '↑', labelRu: 'Лучше' },
  { value: 'aggravation',   icon: '⚡', labelRu: 'Обострение' },
  { value: 'no_change',     icon: '→', labelRu: 'Без изм.' },
  { value: 'worsening',     icon: '↓', labelRu: 'Хуже' },
  { value: 'deterioration', icon: '✕', labelRu: 'Без реакции' },
]

function InlineDynamicsPicker({ consultationId, onSave, lang }: { consultationId: string; onSave: (val: DoctorDynamics) => void; lang: 'ru' | 'en' }) {
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  async function handleSelect(val: DoctorDynamics) {
    setSaving(true)
    await saveDoctorDynamics(consultationId, val)
    onSave(val)
    setSaving(false)
    setOpen(false)
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="text-xs text-gray-300 hover:text-emerald-600 transition-colors mb-1 whitespace-nowrap"
      >
        {lang === 'ru' ? '+ динамика' : '+ dynamics'}
      </button>
    )
  }

  return (
    <div className="flex flex-col gap-1 mb-1">
      {DYNAMICS_OPTIONS.map(opt => (
        <button
          key={opt.value}
          onClick={() => handleSelect(opt.value)}
          disabled={saving}
          className="text-xs px-1.5 py-0.5 rounded border border-gray-200 text-gray-500 hover:border-emerald-400 hover:text-emerald-700 transition-colors whitespace-nowrap"
        >
          {opt.icon} {opt.labelRu}
        </button>
      ))}
    </div>
  )
}

export default function TreatmentProgress({ consultations, followupByConsultation }: Props) {
  const { lang } = useLanguage()
  // Берём только завершённые консультации с назначением, от старых к новым
  const withRx = consultations
    .filter(c => c.status === 'completed' && c.remedy)
    .slice()
    .reverse() // старые → новые

  // Локальный стейт для обновления doctor_dynamics без перезагрузки
  const [dynamicsOverride, setDynamicsOverride] = useState<Record<string, DoctorDynamics>>({})

  if (withRx.length === 0) return null

  return (
    <div className="mb-5">
      <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
        {t(lang).treatmentProgress.title}
      </h2>
      <div className="border border-gray-100 rounded-2xl p-4 shadow-sm overflow-x-auto" style={{ backgroundColor: '#f0ebe3' }}>
        <div className="flex items-center gap-0 min-w-max">
          {withRx.map((c, idx) => {
            const followup = followupByConsultation[c.id]
            const statusStyle = followup?.status ? STATUS_STYLE[followup.status] : null
            const statusInfo = statusStyle ? { label: (t(lang).treatmentProgress as Record<string, any>)[statusStyle.labelKey] as string, color: statusStyle.color } : null
            const isLast = idx === withRx.length - 1

            // Динамика для стрелки: doctor_dynamics следующей консультации (приоритет) или followup текущей
            const nextConsultation = withRx[idx + 1]
            const doctorDyn = nextConsultation
              ? (dynamicsOverride[nextConsultation.id] ?? nextConsultation.doctor_dynamics)
              : null
            const doctorDynInfo = doctorDyn ? DYNAMICS_STYLE[doctorDyn] : null

            // Для последнего элемента: собственный doctor_dynamics или followup
            const selfDyn = isLast
              ? (dynamicsOverride[c.id] ?? c.doctor_dynamics)
              : null
            const selfDynInfo = selfDyn ? DYNAMICS_STYLE[selfDyn] : null

            return (
              <div key={c.id} className="flex items-center gap-0">
                {/* Блок консультации */}
                <div className="flex flex-col items-center gap-1 w-28 shrink-0">
                  {/* Дата */}
                  <span className="text-xs text-gray-400">
                    {c.date
                      ? new Date(c.date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: '2-digit' })
                      : c.scheduled_at
                        ? new Date(c.scheduled_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: '2-digit' })
                        : '—'}
                  </span>

                  {/* Препарат */}
                  <a
                    href={`/patients/${c.patient_id}/consultations/${c.id}`}
                    className="text-center"
                  >
                    <span className="block text-sm font-semibold text-gray-800 leading-tight hover:text-emerald-700 transition-colors">
                      {c.remedy}
                    </span>
                    {c.potency && (
                      <span className="text-xs text-gray-400 font-medium">{c.potency}</span>
                    )}
                  </a>

                  {/* Тип */}
                  <span className={`text-xs px-1.5 py-0.5 rounded-md font-medium ${c.type === 'acute' ? 'bg-orange-50 text-orange-500' : 'bg-emerald-50 text-emerald-600'}`}>
                    {c.type === 'acute' ? t(lang).treatmentProgress.acute : t(lang).treatmentProgress.chronic}
                  </span>
                </div>

                {/* Стрелка + динамика между консультациями */}
                {!isLast && (
                  <div className="flex flex-col items-center mx-1 w-20 shrink-0">
                    {doctorDynInfo ? (
                      <span className={`text-xs px-1.5 py-0.5 rounded border font-medium mb-1 ${doctorDynInfo.color}`}>
                        {lang === 'ru' ? doctorDynInfo.label : doctorDynInfo.labelEn}
                      </span>
                    ) : statusInfo ? (
                      <span className={`text-xs px-1.5 py-0.5 rounded border font-medium mb-1 ${statusInfo.color}`}>
                        {statusInfo.label}
                      </span>
                    ) : (
                      <InlineDynamicsPicker
                        consultationId={nextConsultation!.id}
                        onSave={(val) => setDynamicsOverride(prev => ({ ...prev, [nextConsultation!.id]: val }))}
                        lang={lang}
                      />
                    )}
                    <div className="flex items-center gap-0 w-full">
                      <div className="flex-1 h-px bg-gray-200" />
                      <svg className="w-3 h-3 text-gray-300 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </div>
                  </div>
                )}

                {/* После последнего — показываем динамику если есть */}
                {isLast && (selfDynInfo || statusInfo) && (
                  <div className="flex flex-col items-center mx-1 shrink-0">
                    <div className="flex items-center gap-1 ml-2">
                      <div className="w-6 h-px bg-gray-200" />
                      <span className={`text-xs px-1.5 py-0.5 rounded border font-medium ${(selfDynInfo || statusInfo)!.color}`}>
                        {selfDynInfo
                          ? (lang === 'ru' ? selfDynInfo.label : selfDynInfo.labelEn)
                          : statusInfo!.label}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
