import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import LogoutButton from '@/components/LogoutButton'
import { getLang } from '@/lib/i18n-server'

export default async function AIConsultationSelectPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const lang = await getLang()
  const name = user?.user_metadata?.name || user?.email || ''

  // Загрузить пациентов врача
  const { data: patients } = await supabase
    .from('patients')
    .select('id, name, constitutional_type, updated_at')
    .eq('doctor_id', user.id)
    .order('updated_at', { ascending: false })
    .limit(50)

  return (
    <div className="min-h-screen bg-[#1e1b4b]">
      {/* Шапка */}
      <nav className="h-[54px] border-b px-5 flex items-center justify-between shrink-0 sticky top-0 z-10" style={{ backgroundColor: 'rgba(30,27,75,0.85)', backdropFilter: 'blur(12px)', borderColor: 'rgba(255,255,255,0.08)' }}>
        <Link
          href="/dashboard"
          className="flex items-center gap-1.5 text-sm text-indigo-300 hover:text-white transition-colors group"
        >
          <svg className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          {lang === 'ru' ? 'Назад' : 'Back'}
        </Link>
        <div className="flex items-center gap-3">
          <span className="text-xs text-indigo-400 font-medium">AI-анализ</span>
          <span className="text-xs text-white/30 hidden sm:block">{name.split(' ')[0]}</span>
          <LogoutButton dark={false} />
        </div>
      </nav>

      <main className="max-w-lg mx-auto px-4 py-10">
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
            </svg>
          </div>
          <h1 className="text-xl font-semibold text-white mb-1">
            {lang === 'ru' ? 'Выберите пациента' : 'Select patient'}
          </h1>
          <p className="text-sm text-indigo-300/60">
            {lang === 'ru' ? 'AI проанализирует случай с учётом истории' : 'AI will analyze the case using patient history'}
          </p>
        </div>

        {(!patients || patients.length === 0) ? (
          <div className="text-center py-8">
            <p className="text-sm text-white/40 mb-4">
              {lang === 'ru' ? 'Нет пациентов. Создайте первого пациента.' : 'No patients. Create your first patient.'}
            </p>
            <Link href="/patients/new" className="btn btn-ai">
              {lang === 'ru' ? 'Создать пациента' : 'Create patient'}
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {patients.map(p => (
              <Link
                key={p.id}
                href={`/ai-consultation/${p.id}`}
                className="block rounded-2xl px-4 py-3 transition-all hover:bg-white/[0.08] bg-white/[0.04] border border-white/[0.08]"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-indigo-600/20 flex items-center justify-center shrink-0">
                    <span className="text-xs font-bold text-indigo-300">
                      {p.name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{p.name}</p>
                    {p.constitutional_type && (
                      <p className="text-xs text-indigo-300/50 truncate">{p.constitutional_type}</p>
                    )}
                  </div>
                  <svg className="w-4 h-4 text-white/20 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
