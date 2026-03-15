import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import FollowupForm from './FollowupForm'

export default async function FollowupPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const supabase = await createClient()

  const { data: followup } = await supabase
    .from('followups')
    .select('*, patients(name)')
    .eq('token', token)
    .single()

  if (!followup) notFound()

  // Уже ответили
  if (followup.responded_at) {
    return (
      <div className="min-h-screen bg-green-50 flex items-center justify-center px-6">
        <div className="bg-white rounded-2xl shadow-sm p-8 w-full max-w-sm text-center">
          <div className="text-4xl mb-4">✓</div>
          <h1 className="text-lg font-medium text-gray-900">Вы уже ответили</h1>
          <p className="text-gray-400 mt-2 text-sm">Спасибо, ваш врач видит ваш ответ</p>
        </div>
      </div>
    )
  }

  const patientName = (followup.patients as { name: string } | null)?.name || 'Пациент'

  return (
    <div className="min-h-screen bg-green-50 flex items-center justify-center px-6">
      <div className="bg-white rounded-2xl shadow-sm p-8 w-full max-w-sm">
        <h1 className="text-xl font-semibold text-gray-900 mb-1">
          Как вы себя чувствуете?
        </h1>
        <p className="text-sm text-gray-400 mb-6">
          {patientName} — ответ для вашего врача
        </p>

        <FollowupForm token={token} />
      </div>
    </div>
  )
}
