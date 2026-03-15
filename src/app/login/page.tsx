'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError('Неверный email или пароль')
      setLoading(false)
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div className="min-h-screen flex">
      {/* Левая панель — брендинг */}
      <div className="hidden lg:flex lg:w-2/5 bg-gradient-to-br from-emerald-950 via-emerald-900 to-[#0a1f12] flex-col justify-between p-12 relative overflow-hidden">
        {/* Декоративные круги */}
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-emerald-400/10 blur-3xl" />

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-16">
            <div className="w-8 h-8 rounded-lg bg-emerald-400 flex items-center justify-center font-bold text-emerald-950 text-sm">H</div>
            <span className="text-white font-semibold text-lg tracking-tight">HomeoCase</span>
          </div>

          <h2 className="text-3xl font-bold text-white leading-snug mb-4">
            Ведите пациентов<br />с ясной головой
          </h2>
          <p className="text-emerald-300 text-sm leading-relaxed">
            Цифровая карточка вместо блокнота. Все консультации, расписание и динамика самочувствия — в одном месте.
          </p>
        </div>

        <div className="relative z-10 space-y-3">
          {[
            'Все записи по каждому пациенту',
            'Расписание и запись онлайн',
            'Опрос самочувствия после приёма',
          ].map(f => (
            <div key={f} className="flex items-center gap-3">
              <div className="w-4 h-4 rounded-full bg-emerald-400/20 border border-emerald-400/40 flex items-center justify-center shrink-0">
                <svg className="w-2.5 h-2.5 text-emerald-400" fill="none" viewBox="0 0 10 8">
                  <path d="M1 4l2.5 2.5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <span className="text-emerald-200/70 text-sm">{f}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Правая панель — форма */}
      <div className="flex-1 flex items-center justify-center bg-gray-50 px-6 py-12">
        <div className="w-full max-w-sm">
          {/* Мобильный логотип */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="w-7 h-7 rounded-lg bg-emerald-600 flex items-center justify-center font-bold text-white text-xs">H</div>
            <span className="font-semibold text-gray-900">HomeoCase</span>
          </div>

          <h1 className="text-2xl font-bold text-gray-900 tracking-tight mb-1">Добро пожаловать</h1>
          <p className="text-gray-500 text-sm mb-8">Войдите в свой аккаунт</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5 uppercase tracking-wide">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoFocus
                className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all"
                placeholder="doctor@example.com"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5 uppercase tracking-wide">Пароль</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3">
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-600 text-white rounded-xl py-3 text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50 transition-all shadow-sm shadow-emerald-900/10 mt-2"
            >
              {loading ? 'Входим...' : 'Войти'}
            </button>
          </form>

          <p className="mt-6 text-sm text-gray-400 text-center">
            Нет аккаунта?{' '}
            <Link href="/register" className="text-emerald-600 hover:text-emerald-700 font-medium">
              Зарегистрироваться
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
