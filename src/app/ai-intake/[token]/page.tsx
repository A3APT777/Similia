import { notFound } from 'next/navigation'
import { getAIIntakeByToken } from '@/lib/actions/ai-intake'
import AIIntakeForm from './AIIntakeForm'

export default async function AIIntakePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params

  const intake = await getAIIntakeByToken(token)
  if (!intake) notFound()

  // Просрочена
  if (intake.expires_at && new Date(intake.expires_at) < new Date()) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Ссылка недействительна</h1>
          <p className="text-gray-500 text-sm">Срок действия анкеты истёк. Попросите врача отправить новую.</p>
        </div>
      </div>
    )
  }

  if (intake.status === 'completed') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-white flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 rounded-2xl bg-indigo-100 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Анкета заполнена</h1>
          <p className="text-gray-500 text-sm">Спасибо! Ваши ответы получены. AI подготовит персональный анализ к следующему визиту.</p>
        </div>
      </div>
    )
  }

  return <AIIntakeForm token={token} steps={intake.questions_json as AIStep[]} />
}

// Тип для шагов (дублируем чтобы не создавать лишний импорт)
type AIStep = {
  title: string
  subtitle: string
  fields: {
    key: string
    label: string
    type: 'textarea' | 'text' | 'chips' | 'chips-multi' | 'scale'
    options?: string[]
    hint?: string
    required?: boolean
  }[]
}
