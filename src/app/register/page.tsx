'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { seedDemoData } from '@/lib/actions/seed'

export default function RegisterPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const supabase = createClient()
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name } },
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    // Создаём демо-пациентов для нового аккаунта
    await seedDemoData().catch(() => null)

    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div className="min-h-screen flex">
      {/* Левая панель — брендинг */}
      <div className="hidden lg:flex lg:w-2/5 bg-gradient-to-br from-emerald-950 via-emerald-900 to-[#0a1f12] flex-col justify-between p-12 relative overflow-hidden">
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-emerald-400/10 blur-3xl" />

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-16">
            <div className="w-8 h-8 rounded-lg bg-emerald-400 flex items-center justify-center font-bold text-emerald-950 text-sm">H</div>
            <span className="text-white font-semibold text-lg tracking-tight">HomeoCase</span>
          </div>

          <h2 className="text-3xl font-bold text-white leading-snug mb-4">
            Начните вести<br />пациентов правильно
          </h2>
          <p className="text-emerald-300 text-sm leading-relaxed">
            Создайте аккаунт и уже сегодня откажитесь от бумажных блокнотов и таблиц.
          </p>
        </div>

        <div className="relative z-10 space-y-3">
          {[
            'Бесплатно и без ограничений',
            'Данные защищены и приватны',
            'Работает с любого устройства',
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
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="w-7 h-7 rounded-lg bg-emerald-600 flex items-center justify-center font-bold text-white text-xs">H</div>
            <span className="font-semibold text-gray-900">HomeoCase</span>
          </div>

          <h1 className="text-2xl font-bold text-gray-900 tracking-tight mb-1">Создать аккаунт</h1>
          <p className="text-gray-500 text-sm mb-8">Займёт меньше минуты</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5 uppercase tracking-wide">Ваше имя</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                required
                autoFocus
                className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all"
                placeholder="Иван Иванов"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5 uppercase tracking-wide">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
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
                minLength={6}
                className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all"
                placeholder="Минимум 6 символов"
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
              {loading ? 'Подготавливаем аккаунт...' : 'Зарегистрироваться'}
            </button>
          </form>

          <p className="mt-6 text-sm text-gray-400 text-center">
            Уже есть аккаунт?{' '}
            <Link href="/login" className="text-emerald-600 hover:text-emerald-700 font-medium">
              Войти
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
