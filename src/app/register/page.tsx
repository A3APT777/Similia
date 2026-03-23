'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { t } from '@/lib/i18n'
import { useLanguage } from '@/hooks/useLanguage'
import { Suspense } from 'react'
import RefCookieSetter from '@/components/RefCookieSetter'

import { authInputStyle as inputStyle, authLabelStyle as labelStyle, getAuthInputFocusStyle } from '@/lib/authStyles'

export default function RegisterPage() {
  const router = useRouter()
  const { lang } = useLanguage()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [focusedField, setFocusedField] = useState<string | null>(null)
  const [checkEmail, setCheckEmail] = useState(false)
  const [consent, setConsent] = useState(false)

  function translateAuthError(msg: string): string {
    const m = msg.toLowerCase()
    if (m.includes('already registered') || m.includes('already exists') || m.includes('email_exists')) {
      return 'Этот email уже зарегистрирован — попробуйте войти'
    }
    if (m.includes('password') && (m.includes('6') || m.includes('characters') || m.includes('short'))) {
      return 'Пароль должен быть не менее 6 символов'
    }
    if (m.includes('invalid email') || m.includes('email address')) {
      return 'Введите корректный email-адрес'
    }
    if (m.includes('rate limit') || m.includes('too many')) {
      return 'Слишком много попыток — подождите минуту и попробуйте снова'
    }
    if (m.includes('network') || m.includes('fetch')) {
      return 'Ошибка сети — проверьте подключение к интернету'
    }
    return 'Что-то пошло не так — попробуйте ещё раз'
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const supabase = createClient()
    // Читаем реферальный код из cookie
    const refMatch = document.cookie.match(/ref_code=([^;]+)/)
    const ref_code = refMatch ? decodeURIComponent(refMatch[1]) : undefined

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name, ...(ref_code ? { ref_code } : {}) } },
    })
    if (error) {
      setError(translateAuthError(error.message))
      setLoading(false)
      return
    }
    if (!data?.session) {
      // Supabase требует подтверждение email — показываем экран "проверьте почту"
      setLoading(false)
      setCheckEmail(true)
      return
    }
    // Сбрасываем флаги тура — у нового аккаунта он должен стартовать заново
    localStorage.removeItem('tour_completed')
    localStorage.removeItem('tour_active')
    localStorage.removeItem('tour_consult_active')
    localStorage.removeItem('tour_patient_active')
    localStorage.removeItem('tour_repertory_active')
    localStorage.removeItem('tour_success')
    window.location.href = '/dashboard'
  }

  const getInputStyle = (field: string): React.CSSProperties => ({
    ...inputStyle,
    borderColor: focusedField === field ? '#2d6a4f' : 'var(--sim-border)',
    boxShadow: focusedField === field ? '0 0 0 3px rgba(45,106,79,0.3)' : 'none',
  })

  return (
    <div style={{ minHeight: '100vh', display: 'flex', backgroundColor: 'var(--sim-bg)' }}>
      <Suspense><RefCookieSetter /></Suspense>

      {/* Левая панель */}
      <div style={{
        display: 'none',
        width: '45%',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '48px',
        position: 'relative',
        overflow: 'hidden',
        backgroundColor: 'var(--sim-forest)',
        flexShrink: 0,
      }} className="auth-left-panel">
        {/* Ботаническая иллюстрация */}
        <div style={{
          position: 'absolute',
          bottom: '-20px',
          right: '-20px',
          width: '280px',
          height: '280px',
          backgroundImage: 'url(/illustrations/arnica.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          opacity: 0.08,
          pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(to bottom, rgba(26,48,32,0.2) 0%, rgba(26,48,32,0.75) 100%)',
          pointerEvents: 'none',
        }} />

        {/* Логотип */}
        <div style={{ position: 'relative', zIndex: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '48px' }}>
            <svg width="28" height="28" viewBox="0 0 36 36" fill="none">
              <ellipse cx="13" cy="18" rx="7" ry="11" transform="rotate(-15 13 18)" fill="#7dd4a8" opacity="0.9"/>
              <ellipse cx="23" cy="18" rx="7" ry="11" transform="rotate(15 23 18)" fill="#f7f3ed" opacity="0.45"/>
              <path d="M18 8 Q18 18 18 28" stroke="#1a3020" strokeWidth="0.8" strokeLinecap="round"/>
            </svg>
            <span style={{
              fontFamily: "'Cormorant Garamond', Georgia, serif",
              fontSize: '20px',
              fontWeight: 400,
              color: '#f7f3ed',
              letterSpacing: '0.02em',
            }}>Similia</span>
          </div>

          <h2 style={{
            fontFamily: "'Cormorant Garamond', Georgia, serif",
            fontSize: '38px',
            fontWeight: 300,
            color: 'rgba(255,255,255,0.95)',
            lineHeight: 1.25,
            marginBottom: '16px',
          }}>
            {t(lang).auth.registerHero.split('\n').map((line, i, arr) => (
              <span key={i}>{line}{i < arr.length - 1 && <br />}</span>
            ))}
          </h2>
          <p style={{ fontSize: '14px', lineHeight: 1.65, color: 'rgba(255,255,255,0.45)' }}>
            {t(lang).auth.registerHeroDesc}
          </p>
        </div>

        {/* Галочки и цитата */}
        <div style={{ position: 'relative', zIndex: 10 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '24px' }}>
            {t(lang).auth.registerFeatures.map(f => (
              <div key={f} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '20px', height: '20px', borderRadius: '50%',
                  backgroundColor: 'rgba(125,212,168,0.15)',
                  border: '1px solid rgba(125,212,168,0.4)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <svg width="10" height="8" fill="none" viewBox="0 0 10 8">
                    <path d="M1 4l2.5 2.5L9 1" stroke="#7dd4a8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <span style={{ fontSize: '14px', color: 'rgba(255,255,255,0.6)' }}>{f}</span>
              </div>
            ))}
          </div>

          <div style={{ paddingTop: '20px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
            <p style={{
              fontFamily: "'Cormorant Garamond', Georgia, serif",
              fontSize: '17px',
              fontStyle: 'italic',
              color: 'rgba(255,255,255,0.5)',
              marginBottom: '4px',
            }}>
              «Similia similibus curantur»
            </p>
            <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.25)' }}>Ганеман, 1796</p>
          </div>
        </div>
      </div>

      {/* Правая панель — форма */}
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '48px 24px',
        backgroundColor: 'var(--sim-bg)',
      }}>
        <div style={{ width: '100%', maxWidth: '360px' }}>

          {/* Экран "Проверьте почту" */}
          {checkEmail && (
            <div style={{ textAlign: 'center' }}>
              <div style={{
                width: '64px', height: '64px', borderRadius: '50%',
                backgroundColor: 'rgba(45,106,79,0.1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 24px',
              }}>
                <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="#2d6a4f" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                </svg>
              </div>
              <h1 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: '28px', fontWeight: 400, color: 'var(--sim-forest)', marginBottom: '12px' }}>
                Проверьте почту
              </h1>
              <p style={{ fontSize: '15px', color: 'var(--sim-text-hint)', marginBottom: '8px', lineHeight: 1.6 }}>
                Мы отправили письмо на <strong style={{ color: '#3a2e1a' }}>{email}</strong>
              </p>
              <p style={{ fontSize: '14px', color: '#b8a898', marginBottom: '32px', lineHeight: 1.6 }}>
                Нажмите на ссылку в письме — и вы сразу окажетесь в системе. Если письма нет, проверьте папку «Спам».
              </p>
              <button
                onClick={() => setCheckEmail(false)}
                style={{ fontSize: '14px', color: 'var(--sim-green)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
              >
                ← Вернуться к форме
              </button>
            </div>
          )}

          {/* Мобильный логотип */}
          {!checkEmail && <div className="auth-mobile-logo" style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '32px' }}>
            <svg width="26" height="26" viewBox="0 0 36 36" fill="none">
              <ellipse cx="13" cy="18" rx="7" ry="11" transform="rotate(-15 13 18)" fill="#7dd4a8" opacity="0.9"/>
              <ellipse cx="23" cy="18" rx="7" ry="11" transform="rotate(15 23 18)" fill="#f7f3ed" opacity="0.45"/>
              <path d="M18 8 Q18 18 18 28" stroke="#1a3020" strokeWidth="0.8" strokeLinecap="round"/>
            </svg>
            <span style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: '20px', fontWeight: 400, color: 'var(--sim-forest)' }}>
              Similia
            </span>
          </div>}

          {!checkEmail && <>
          <h1 style={{
            fontFamily: "'Cormorant Garamond', Georgia, serif",
            fontSize: '28px',
            fontWeight: 400,
            color: 'var(--sim-forest)',
            marginBottom: '6px',
          }}>
            {t(lang).auth.createAccount}
          </h1>
          <p style={{ fontSize: '15px', color: 'var(--sim-text-hint)', marginBottom: '32px' }}>
            {t(lang).auth.lessThanMinute}
          </p>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <label style={labelStyle}>{t(lang).auth.yourName}</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                onFocus={() => setFocusedField('name')}
                onBlur={() => setFocusedField(null)}
                required
                autoFocus
                placeholder={t(lang).auth.namePlaceholder}
                style={getInputStyle('name')}
              />
            </div>

            <div>
              <label style={labelStyle}>Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onFocus={() => setFocusedField('email')}
                onBlur={() => setFocusedField(null)}
                required
                placeholder="doctor@example.com"
                style={getInputStyle('email')}
              />
            </div>

            <div>
              <label style={labelStyle}>{t(lang).auth.password}</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                onFocus={() => setFocusedField('password')}
                onBlur={() => setFocusedField(null)}
                required
                minLength={6}
                placeholder={t(lang).auth.passwordPlaceholder}
                style={getInputStyle('password')}
              />
            </div>

            {/* Согласие на обработку ПД */}
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={consent}
                onChange={e => setConsent(e.target.checked)}
                style={{ marginTop: '3px', accentColor: '#2d6a4f', width: '16px', height: '16px', flexShrink: 0 }}
              />
              <span style={{ fontSize: '13px', color: 'var(--sim-text-sec)', lineHeight: 1.5 }}>
                {lang === 'ru'
                  ? <>Я соглашаюсь с <Link href="/privacy" target="_blank" style={{ color: 'var(--sim-green)', textDecoration: 'underline' }}>политикой конфиденциальности</Link> и даю согласие на обработку персональных данных в соответствии с Федеральным законом №152-ФЗ</>
                  : <>I agree to the <Link href="/privacy" target="_blank" style={{ color: 'var(--sim-green)', textDecoration: 'underline' }}>privacy policy</Link> and consent to personal data processing</>
                }
              </span>
            </label>

            {error && (
              <div style={{ backgroundColor: '#fef0f0', border: '1px solid #fbd5d5', borderRadius: '8px', padding: '12px 16px' }}>
                <p style={{ color: '#c0392b', fontSize: '14px' }}>{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !consent}
              style={{
                width: '100%',
                backgroundColor: loading ? '#5a7060' : '#1a3020',
                color: '#f7f3ed',
                border: 'none',
                borderRadius: '100px',
                padding: '14px 24px',
                fontSize: '15px',
                fontWeight: 500,
                cursor: loading ? 'default' : 'pointer',
                transition: 'background-color 0.15s',
                opacity: loading ? 0.7 : 1,
              }}
              onMouseEnter={e => { if (!loading) e.currentTarget.style.backgroundColor = '#2d6a4f' }}
              onMouseLeave={e => { if (!loading) e.currentTarget.style.backgroundColor = '#1a3020' }}
            >
              {loading ? t(lang).auth.creatingAccount : t(lang).auth.register}
            </button>
          </form>

          <p style={{ marginTop: '24px', fontSize: '14px', color: 'var(--sim-text-hint)', textAlign: 'center' }}>
            {t(lang).auth.hasAccount}{' '}
            <Link href="/login" style={{ color: 'var(--sim-green)', fontWeight: 500, textDecoration: 'none' }}>
              {t(lang).auth.signIn}
            </Link>
          </p>

          <p style={{ marginTop: '16px', fontSize: '12px', color: 'var(--sim-text-hint)', textAlign: 'center' }}>
            {t(lang).auth.freeAndSecure}
          </p>
          </>}
        </div>
      </div>

      <style>{`
        @media (min-width: 1024px) {
          .auth-left-panel { display: flex !important; }
          .auth-mobile-logo { display: none !important; }
        }
      `}</style>
    </div>
  )
}
