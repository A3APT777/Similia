import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { getAge } from '@/lib/utils'
import PrintTrigger from './PrintTrigger'
import { t } from '@/lib/i18n'
import { getLang } from '@/lib/i18n-server'

// Секции анкет для отображения в PDF
const PRIMARY_SECTIONS = [
  { title: 'Главные жалобы', keys: ['chief_complaint','duration','cause'] },
  { title: 'Ощущения', keys: ['sensation','location','radiation','intensity'] },
  { title: 'Модальности', keys: ['worse_from','better_from','time_worse'] },
  { title: 'Общее состояние', keys: ['thermal','thirst','perspiration','energy'] },
  { title: 'Сон и питание', keys: ['sleep','dreams','food_desires','food_aversions'] },
  { title: 'Психоэмоциональное', keys: ['emotional','stress','fears'] },
  { title: 'История здоровья', keys: ['past_illnesses','medications','allergies','family_history'] },
]

const ACUTE_SECTIONS = [
  { title: 'Начало', keys: ['acute_complaint','onset','speed','trigger'] },
  { title: 'Симптомы', keys: ['main_symptom','location','radiation','intensity'] },
  { title: 'Модальности', keys: ['worse_from','better_from','position'] },
  { title: 'Температура', keys: ['fever','chills','thirst','sweating'] },
  { title: 'Сопутствующее', keys: ['other_symptoms','discharge','behavior','appetite_acute'] },
]

const FIELD_LABELS: Record<string, string> = {
  chief_complaint: 'Жалобы', duration: 'Как давно', cause: 'Причина',
  sensation: 'Ощущение', location: 'Локализация', radiation: 'Иррадиация', intensity: 'Интенсивность',
  worse_from: 'Хуже от', better_from: 'Лучше от', time_worse: 'Время ухудшения',
  thermal: 'Температурный режим', thirst: 'Жажда', perspiration: 'Потливость', energy: 'Энергия',
  sleep: 'Сон', dreams: 'Сновидения', food_desires: 'Желания в еде', food_aversions: 'Отвращения',
  emotional: 'Эмоции', stress: 'Стресс', fears: 'Страхи',
  past_illnesses: 'Болезни/операции', medications: 'Лекарства', allergies: 'Аллергии', family_history: 'Семейная история',
  acute_complaint: 'Жалобы', onset: 'Когда началось', speed: 'Скорость развития', trigger: 'Провокатор',
  main_symptom: 'Главный симптом', position: 'Положение тела',
  fever: 'Температура', chills: 'Озноб', sweating: 'Потоотделение',
  other_symptoms: 'Другие симптомы', discharge: 'Выделения', behavior: 'Поведение', appetite_acute: 'Аппетит',
}

const FOLLOWUP_LABELS: Record<string, string> = {
  better: '↑ Лучше',
  same: '→ Без изменений',
  worse: '↓ Хуже',
  new_symptoms: '⚠ Новые симптомы',
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('ru-RU', {
    timeZone: 'Europe/Moscow',
    day: 'numeric', month: 'long', year: 'numeric',
  })
}

function formatLocalDate(dateStr: string) {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d, 12)).toLocaleDateString('ru-RU', {
    timeZone: 'UTC', day: 'numeric', month: 'long', year: 'numeric',
  })
}

export default async function ExportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: patient } = await supabase.from('patients').select('*').eq('id', id).eq('doctor_id', user.id).single()
  if (!patient) notFound()

  const { data: consultations } = await supabase
    .from('consultations')
    .select('*')
    .eq('patient_id', id)
    .neq('status', 'cancelled')
    .order('scheduled_at', { ascending: true, nullsFirst: false })
    .order('date', { ascending: true })

  const completed = (consultations || []).filter(c => c.status === 'completed')
  const consultationIds = completed.map(c => c.id)

  const { data: followups } = consultationIds.length > 0
    ? await supabase.from('followups').select('*').in('consultation_id', consultationIds)
    : { data: [] }

  const followupMap = Object.fromEntries((followups || []).map(f => [f.consultation_id, f]))

  const { data: intakeForms } = await supabase
    .from('intake_forms')
    .select('*')
    .eq('patient_id', id)
    .eq('status', 'completed')
    .order('created_at', { ascending: false })

  const primaryIntake = (intakeForms || []).find(f => f.type === 'primary') || null
  const acuteIntake = (intakeForms || []).find(f => f.type === 'acute') || null

  const exportDate = new Date().toLocaleDateString('ru-RU', {
    timeZone: 'Europe/Moscow', day: 'numeric', month: 'long', year: 'numeric',
  })

  const lang = await getLang()

  // Нумерация хронических консультаций
  let chronicIndex = 0

  return (
    <>
      <PrintTrigger />

      <div className="bg-white min-h-screen font-sans text-gray-900">
        <div className="max-w-2xl mx-auto px-8 py-10 print:px-6 print:py-8">

          {/* ── Шапка ── */}
          <div className="flex items-start justify-between mb-8 pb-6 border-b-2 border-gray-900">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-1">{t(lang).export.title}</p>
              <h1 className="text-2xl font-bold text-gray-900 leading-tight">{patient.name}</h1>
              <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1.5 text-sm text-gray-500">
                {patient.birth_date && <span>{getAge(patient.birth_date)}</span>}
                {patient.phone && <span>{patient.phone}</span>}
                {patient.email && <span>{patient.email}</span>}
              </div>
              <p className="text-xs text-gray-400 mt-1.5">
                {t(lang).export.firstVisit} {formatLocalDate(patient.first_visit_date)} · {completed.length} {t(lang).export.consultations}
              </p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-xs text-gray-400">{t(lang).export.exported}</p>
              <p className="text-xs text-gray-500 font-medium">{exportDate}</p>
            </div>
          </div>

          {/* ── Анкеты ── */}
          {(primaryIntake || acuteIntake) && (
            <div className="mb-8">
              <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-4">{t(lang).export.intakes}</h2>

              {[
                primaryIntake && { intake: primaryIntake, sections: PRIMARY_SECTIONS, label: t(lang).export.primaryIntake },
                acuteIntake && { intake: acuteIntake, sections: ACUTE_SECTIONS, label: t(lang).export.acuteIntake },
              ].filter(Boolean).map(({ intake, sections, label }: any) => (
                <div key={intake.id} className="mb-5 border border-gray-200 rounded-xl overflow-hidden">
                  <div className="bg-gray-50 px-4 py-2.5 border-b border-gray-200 flex items-center justify-between">
                    <p className="text-sm font-semibold text-gray-700">{label}</p>
                    {intake.completed_at && (
                      <p className="text-xs text-gray-400">{formatDate(intake.completed_at)}</p>
                    )}
                  </div>
                  <div className="px-4 py-3 grid grid-cols-2 gap-x-6 gap-y-3">
                    {sections.flatMap((s: any) =>
                      s.keys
                        .filter((k: string) => intake.answers?.[k]?.trim())
                        .map((k: string) => (
                          <div key={k}>
                            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-0.5">
                              {FIELD_LABELS[k] || k}
                            </p>
                            <p className="text-sm text-gray-800 leading-snug">
                              {k === 'intensity' ? `${intake.answers[k]} / 10` : intake.answers[k]}
                            </p>
                          </div>
                        ))
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── Консультации ── */}
          {completed.length > 0 && (
            <div>
              <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-4">{t(lang).export.consultationHistory}</h2>

              <div className="space-y-5">
                {completed.map(c => {
                  const isAcute = c.type === 'acute'
                  if (!isAcute) chronicIndex++
                  const followup = followupMap[c.id]

                  const dateStr = c.scheduled_at
                    ? formatDate(c.scheduled_at)
                    : formatLocalDate(c.date)

                  const title = isAcute
                    ? t(lang).timeline.acuteCase
                    : chronicIndex === 1 ? t(lang).timeline.firstConsultation
                    : t(lang).timeline.consultationN(chronicIndex)

                  return (
                    <div key={c.id} className="border border-gray-200 rounded-xl overflow-hidden print:break-inside-avoid">
                      {/* Заголовок консультации */}
                      <div className={`px-4 py-2.5 border-b flex items-center justify-between ${isAcute ? 'bg-orange-50 border-orange-200' : 'bg-gray-50 border-gray-200'}`}>
                        <div className="flex items-center gap-2">
                          <p className={`text-sm font-semibold ${isAcute ? 'text-orange-800' : 'text-gray-800'}`}>
                            {title}
                          </p>
                          {isAcute && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 border border-orange-200">
                              {t(lang).consultation.acuteShort}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-400">{dateStr}</p>
                      </div>

                      <div className="px-4 py-3 space-y-3">
                        {/* Заметки */}
                        {c.notes?.trim() && (
                          <div>
                            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">{t(lang).export.notes}</p>
                            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{c.notes}</p>
                          </div>
                        )}

                        {/* Назначение */}
                        {c.remedy && (
                          <div className="flex items-center gap-3 pt-1 border-t border-gray-100">
                            <div>
                              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-0.5">{t(lang).export.prescription}</p>
                              <p className="text-sm font-semibold text-gray-800">
                                {c.remedy}{c.potency ? ` ${c.potency}` : ''}{c.pellets ? ` · ${c.pellets} ${t(lang).export.pellets}` : ''}
                              </p>
                              {c.dosage && <p className="text-xs text-gray-500 mt-0.5">{c.dosage}</p>}
                            </div>

                            {/* Ответ пациента */}
                            {followup?.status && FOLLOWUP_LABELS[followup.status] && (
                              <div className="ml-auto text-right">
                                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-0.5">{t(lang).export.patientResponse}</p>
                                <p className="text-sm font-semibold text-gray-700">{FOLLOWUP_LABELS[followup.status]}</p>
                                {followup.comment && (
                                  <p className="text-xs text-gray-400 italic mt-0.5 max-w-48">«{followup.comment}»</p>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* ── Подвал ── */}
          <div className="mt-10 pt-4 border-t border-gray-200 flex items-center justify-between">
            <p className="text-xs text-gray-300">Similia</p>
            <p className="text-xs text-gray-300">{t(lang).export.confidential}</p>
          </div>

        </div>
      </div>
    </>
  )
}
