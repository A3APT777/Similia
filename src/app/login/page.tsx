'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { t } from '@/lib/i18n'
import { useLanguage } from '@/hooks/useLanguage'

export default function LoginPage() {
  const { lang } = useLanguage()
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isPending, setIsPending] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setIsPending(true)

    try {
      const result = await signIn('credentials', {
        email: email.trim().toLowerCase(),
        password,
        redirect: false,
      })

      if (result?.error) {
        setError(t(lang).auth.invalidCredentials)
      } else {
        router.push('/dashboard')
        router.refresh()
      }
    } catch {
      setError(lang === 'ru' ? 'Ошибка сети — проверьте подключение' : 'Network error')
    } finally {
      setIsPending(false)
    }
  }

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: '#f7f3ed' }}>

      {/* ═══ Левая панель (desktop) ═══ */}
      <div className="hidden lg:flex w-[45%] flex-col justify-between p-12 relative overflow-hidden shrink-0" style={{ backgroundColor: '#1a3020' }}>
        {/* Декоративный градиент */}
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 80% 60% at 30% 80%, rgba(45,106,79,0.3) 0%, transparent 70%)' }} />

        {/* Логотип */}
        <div className="relative z-10">
          <div className="flex items-center gap-2.5 mb-12">
            <svg width="28" height="28" viewBox="0 0 36 36" fill="none">
              <ellipse cx="13" cy="18" rx="7" ry="11" transform="rotate(-15 13 18)" fill="#7dd4a8" opacity="0.9"/>
              <ellipse cx="23" cy="18" rx="7" ry="11" transform="rotate(15 23 18)" fill="#f7f3ed" opacity="0.45"/>
            </svg>
            <span style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: '20px', fontWeight: 400, color: '#f7f3ed', letterSpacing: '0.02em' }}>
              Similia
            </span>
          </div>

          <h2 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: '42px', fontWeight: 300, lineHeight: 1.15, letterSpacing: '-0.02em' }} className="text-white/95 mb-4">
            {t(lang).auth.loginHero.split('\n').map((line, i, arr) => (
              <span key={i}>{line}{i < arr.length - 1 && <br />}</span>
            ))}
          </h2>
          <p className="text-[15px] leading-relaxed text-white/40 max-w-[320px]">
            {t(lang).auth.loginHeroDesc}
          </p>
        </div>

        {/* Цитата */}
        <div className="relative z-10">
          <div className="pt-5" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <p style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }} className="text-[18px] italic font-light text-white/35 mb-1.5">
              «Similia similibus curantur»
            </p>
            <p className="text-[11px] text-white/20 tracking-widest">
              Самуэль Ганеман, 1796
            </p>
          </div>
        </div>
      </div>

      {/* ═══ Правая панель — форма ═══ */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-[380px]">

          {/* Мобильный логотип */}
          <div className="lg:hidden flex items-center gap-2.5 mb-10">
            <svg width="26" height="26" viewBox="0 0 36 36" fill="none">
              <ellipse cx="13" cy="18" rx="7" ry="11" transform="rotate(-15 13 18)" fill="#2d6a4f" opacity="0.9"/>
              <ellipse cx="23" cy="18" rx="7" ry="11" transform="rotate(15 23 18)" fill="#1a3020" opacity="0.65"/>
            </svg>
            <span style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }} className="text-[20px] font-normal text-[#1a3020] tracking-wide">
              Similia
            </span>
          </div>

          <h1 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }} className="text-[32px] font-light text-[#1a1a0a] mb-2 tracking-tight">
            {t(lang).auth.welcome}
          </h1>
          <p className="text-[15px] text-[#8a7e6c] mb-10">
            {t(lang).auth.signInPrompt}
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
            <div>
              <label htmlFor="login-email" className="block text-[11px] font-medium uppercase tracking-[0.1em] text-[#8a7e6c] mb-2">
                Email
              </label>
              <input
                id="login-email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoFocus
                placeholder="doctor@example.com"
                className="w-full h-12 px-4 rounded-xl text-[15px] text-[#1a1a0a] placeholder-[#c0b8a8] outline-none transition-all duration-200 focus:ring-2 focus:ring-[#2d6a4f]/20 focus:border-[#2d6a4f]"
                style={{ backgroundColor: 'rgba(255,255,255,0.6)', border: '1px solid rgba(0,0,0,0.08)' }}
              />
            </div>

            {/* Пароль */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label htmlFor="login-password" className="text-[11px] font-medium uppercase tracking-[0.1em] text-[#8a7e6c]">
                  {t(lang).auth.password}
                </label>
                <Link href="/forgot-password" className="text-[13px] text-[#2d6a4f] hover:underline underline-offset-2">
                  {t(lang).auth.forgotPassword}
                </Link>
              </div>
              <input
                id="login-password"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="w-full h-12 px-4 rounded-xl text-[15px] text-[#1a1a0a] placeholder-[#c0b8a8] outline-none transition-all duration-200 focus:ring-2 focus:ring-[#2d6a4f]/20 focus:border-[#2d6a4f]"
                style={{ backgroundColor: 'rgba(255,255,255,0.6)', border: '1px solid rgba(0,0,0,0.08)' }}
              />
            </div>

            {/* Ошибка */}
            {error && (
              <p role="alert" className="text-[13px] text-[#dc2626]">{error}</p>
            )}

            {/* Кнопка */}
            <button
              type="submit"
              disabled={isPending}
              className="w-full h-12 rounded-full text-[15px] font-medium text-white transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_8px_30px_rgba(45,106,79,0.3)] disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-none"
              style={{ backgroundColor: '#1a3020' }}
            >
              {isPending ? t(lang).auth.signingIn : t(lang).auth.signIn}
            </button>
          </form>

          <p className="mt-8 text-center text-[14px] text-[#8a7e6c]">
            {t(lang).auth.noAccount}{' '}
            <Link href="/register" className="text-[#2d6a4f] font-medium hover:underline underline-offset-2">
              {t(lang).auth.register}
            </Link>
          </p>

          <p className="mt-4 text-center text-[12px] text-[#b0a890]">
            {t(lang).auth.freeAndSecure}
          </p>
        </div>
      </div>
    </div>
  )
}
