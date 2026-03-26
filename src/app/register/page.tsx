'use client'

import { useState, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { signIn } from 'next-auth/react'
import Link from 'next/link'
import Logo from '@/components/Logo'
import { t } from '@/lib/i18n'
import { useLanguage } from '@/hooks/useLanguage'
import RefCookieSetter from '@/components/RefCookieSetter'

export default function RegisterPage() {
  const router = useRouter()
  const { lang } = useLanguage()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [consent, setConsent] = useState(false)

  function translateAuthError(msg: string): string {
    const m = msg.toLowerCase()
    if (m.includes('already') || m.includes('exists')) return 'Этот email уже зарегистрирован — попробуйте войти'
    if (m.includes('password') && (m.includes('8') || m.includes('characters'))) return 'Пароль должен быть не менее 8 символов'
    if (m.includes('rate limit') || m.includes('too many')) return 'Слишком много попыток — подождите минуту'
    if (m.includes('network') || m.includes('fetch')) return 'Ошибка сети — проверьте подключение'
    return 'Что-то пошло не так — попробуйте ещё раз'
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const refMatch = document.cookie.match(/ref_code=([^;]+)/)
    const referralCode = refMatch ? decodeURIComponent(refMatch[1]) : undefined

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name, referralCode }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(translateAuthError(data.error || 'unknown'))
        setLoading(false)
        return
      }

      // Автоматический вход после регистрации
      const signInResult = await signIn('credentials', { email, password, redirect: false })

      if (signInResult?.error) {
        setLoading(false)
        router.push('/login')
        return
      }

      // Сброс флагов тура
      localStorage.removeItem('tour_completed')
      localStorage.removeItem('tour_active')
      localStorage.removeItem('tour_consult_active')
      localStorage.removeItem('tour_patient_active')
      localStorage.removeItem('tour_repertory_active')
      localStorage.removeItem('tour_success')
      window.location.href = '/dashboard'
    } catch {
      setError(translateAuthError('network'))
      setLoading(false)
    }
  }

  const inputClass = "w-full h-12 px-4 rounded-xl text-[15px] text-[#1a1a0a] placeholder-[#c0b8a8] outline-none transition-all duration-200 focus:ring-2 focus:ring-[#2d6a4f]/20 focus:border-[#2d6a4f]"
  const inputStyle = { backgroundColor: 'rgba(255,255,255,0.6)', border: '1px solid rgba(0,0,0,0.08)' }

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: '#f7f3ed' }}>
      <Suspense><RefCookieSetter /></Suspense>

      {/* ═══ Левая панель (desktop) ═══ */}
      <div className="hidden lg:flex w-[45%] flex-col justify-between p-12 relative overflow-hidden shrink-0" style={{ backgroundColor: '#1a3020' }}>
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 80% 60% at 30% 80%, rgba(45,106,79,0.3) 0%, transparent 70%)' }} />

        <div className="relative z-10">
          <div className="flex items-center gap-2.5 mb-12">
            <Logo size={28} variant="light" />
            <span className="heading-serif text-[20px] font-normal text-[#f7f3ed] tracking-wide">
              Similia
            </span>
          </div>

          <h2 className="heading-serif text-[42px] font-light text-white/95 leading-[1.15] mb-4 tracking-tight">
            {t(lang).auth.registerHero.split('\n').map((line, i, arr) => (
              <span key={i}>{line}{i < arr.length - 1 && <br />}</span>
            ))}
          </h2>
          <p className="text-[15px] leading-relaxed text-white/40 max-w-[320px]">
            {t(lang).auth.registerHeroDesc}
          </p>
        </div>

        <div className="relative z-10">
          <div className="pt-5" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <p className="heading-serif text-[18px] italic font-light text-white/35 mb-1.5">
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
            <Logo size={26} />
            <span className="heading-serif text-[20px] font-normal text-[#1a3020] tracking-wide">
              Similia
            </span>
          </div>

          <h1 className="heading-serif text-[32px] font-light text-[#1a1a0a] mb-2 tracking-tight">
            {t(lang).auth.createAccount}
          </h1>
          <p className="text-[15px] text-[#8a7e6c] mb-10">
            {t(lang).auth.lessThanMinute}
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Имя */}
            <div>
              <label className="block text-[11px] font-medium uppercase tracking-[0.1em] text-[#8a7e6c] mb-2">
                {t(lang).auth.yourName}
              </label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                required
                autoFocus
                placeholder={t(lang).auth.namePlaceholder}
                className={inputClass}
                style={inputStyle}
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-[11px] font-medium uppercase tracking-[0.1em] text-[#8a7e6c] mb-2">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                placeholder="doctor@example.com"
                className={inputClass}
                style={inputStyle}
              />
            </div>

            {/* Пароль */}
            <div>
              <label className="block text-[11px] font-medium uppercase tracking-[0.1em] text-[#8a7e6c] mb-2">
                {t(lang).auth.password}
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                minLength={8}
                placeholder={t(lang).auth.passwordPlaceholder}
                className={inputClass}
                style={inputStyle}
              />
            </div>

            {/* Согласие на ПД */}
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={consent}
                onChange={e => setConsent(e.target.checked)}
                className="mt-0.5 w-4 h-4 shrink-0 accent-[#2d6a4f]"
              />
              <span className="text-[13px] text-[#6b5e45] leading-relaxed">
                {lang === 'ru'
                  ? <>Я соглашаюсь с <Link href="/privacy" target="_blank" className="text-[#2d6a4f] underline underline-offset-2">политикой конфиденциальности</Link> и даю согласие на обработку персональных данных (152-ФЗ)</>
                  : <>I agree to the <Link href="/privacy" target="_blank" className="text-[#2d6a4f] underline underline-offset-2">privacy policy</Link> and consent to personal data processing</>
                }
              </span>
            </label>

            {/* Ошибка */}
            {error && (
              <p role="alert" className="text-[13px] text-[#dc2626]">{error}</p>
            )}

            {/* Кнопка */}
            <button
              type="submit"
              disabled={loading || !consent}
              className="w-full h-12 rounded-full text-[15px] font-medium text-white transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_8px_30px_rgba(45,106,79,0.3)] disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-none"
              style={{ backgroundColor: '#1a3020' }}
            >
              {loading ? t(lang).auth.creatingAccount : t(lang).auth.register}
            </button>
          </form>

          <p className="mt-8 text-center text-[14px] text-[#8a7e6c]">
            {t(lang).auth.hasAccount}{' '}
            <Link href="/login" className="text-[#2d6a4f] font-medium hover:underline underline-offset-2">
              {t(lang).auth.signIn}
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
