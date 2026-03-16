import { Consultation, Followup } from '@/types'

type Props = {
  consultations: Consultation[]
  followupByConsultation: Record<string, Followup>
}

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  better:       { label: 'Улучшение',         color: 'text-green-700 bg-green-50 border-green-200' },
  same:         { label: 'Без изменений',      color: 'text-gray-600 bg-gray-50 border-gray-200' },
  worse:        { label: 'Ухудшение',          color: 'text-red-600 bg-red-50 border-red-200' },
  new_symptoms: { label: 'Новые симптомы',     color: 'text-orange-600 bg-orange-50 border-orange-200' },
}

export default function TreatmentProgress({ consultations, followupByConsultation }: Props) {
  // Берём только завершённые консультации с назначением, от старых к новым
  const withRx = consultations
    .filter(c => c.status === 'completed' && c.remedy)
    .slice()
    .reverse() // старые → новые

  if (withRx.length === 0) return null

  return (
    <div className="mb-5">
      <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
        Динамика лечения
      </h2>
      <div className="border border-gray-100 rounded-2xl p-4 shadow-sm overflow-x-auto" style={{ backgroundColor: '#f0ebe3' }}>
        <div className="flex items-center gap-0 min-w-max">
          {withRx.map((c, idx) => {
            const followup = followupByConsultation[c.id]
            const statusInfo = followup?.status ? STATUS_LABEL[followup.status] : null
            const isLast = idx === withRx.length - 1

            return (
              <div key={c.id} className="flex items-center gap-0">
                {/* Блок консультации */}
                <div className="flex flex-col items-center gap-1 w-28 shrink-0">
                  {/* Дата */}
                  <span className="text-[10px] text-gray-400">
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
                      <span className="text-[11px] text-gray-400 font-medium">{c.potency}</span>
                    )}
                  </a>

                  {/* Тип */}
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-medium ${c.type === 'acute' ? 'bg-orange-50 text-orange-500' : 'bg-emerald-50 text-emerald-600'}`}>
                    {c.type === 'acute' ? 'острый' : 'хрон.'}
                  </span>
                </div>

                {/* Стрелка + реакция */}
                {!isLast && (
                  <div className="flex flex-col items-center mx-1 w-20 shrink-0">
                    {statusInfo ? (
                      <span className={`text-[10px] px-1.5 py-0.5 rounded border font-medium mb-1 ${statusInfo.color}`}>
                        {statusInfo.label}
                      </span>
                    ) : (
                      <span className="text-[10px] text-gray-300 mb-1">нет отзыва</span>
                    )}
                    <div className="flex items-center gap-0 w-full">
                      <div className="flex-1 h-px bg-gray-200" />
                      <svg className="w-3 h-3 text-gray-300 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </div>
                  </div>
                )}

                {/* После последнего — показываем реакцию если есть */}
                {isLast && statusInfo && (
                  <div className="flex flex-col items-center mx-1 shrink-0">
                    <div className="flex items-center gap-1 ml-2">
                      <div className="w-6 h-px bg-gray-200" />
                      <span className={`text-[10px] px-1.5 py-0.5 rounded border font-medium ${statusInfo.color}`}>
                        {statusInfo.label}
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
