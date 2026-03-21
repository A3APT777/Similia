import { getPreVisitSurveyByToken } from '@/lib/actions/surveys'
import { createServiceClient } from '@/lib/supabase/service'
import PreVisitSurveyForm from './PreVisitSurveyForm'

export default async function SurveyPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const survey = await getPreVisitSurveyByToken(token)

  if (!survey) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--sim-bg)' }}>
        <div className="text-center p-8">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Опросник не найден</h1>
          <p className="text-gray-600">Ссылка недействительна или устарела.</p>
        </div>
      </div>
    )
  }

  if (survey.status === 'completed') {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--sim-bg)' }}>
        <div className="text-center p-8">
          <div className="text-4xl mb-4">✓</div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Спасибо!</h1>
          <p className="text-gray-600">Вы уже заполнили этот опросник. Врач получит ваши ответы перед приёмом.</p>
        </div>
      </div>
    )
  }

  if (survey.expires_at && new Date(survey.expires_at) < new Date()) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--sim-bg)' }}>
        <div className="text-center p-8">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Срок истёк</h1>
          <p className="text-gray-600">Ссылка на опросник больше не действительна. Обратитесь к вашему врачу.</p>
        </div>
      </div>
    )
  }

  // Получаем имя врача для отображения
  const supabase = createServiceClient()
  const { data: doctor } = await supabase
    .from('doctor_settings')
    .select('*')
    .eq('doctor_id', survey.doctor_id)
    .maybeSingle()

  // Получаем имя пациента
  const { data: patient } = await supabase
    .from('patients')
    .select('name')
    .eq('id', survey.patient_id)
    .single()

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--sim-bg)' }}>
      <PreVisitSurveyForm
        token={token}
        patientName={patient?.name || ''}
      />
    </div>
  )
}
