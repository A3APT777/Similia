'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { t } from '@/lib/i18n'
import { useLanguage } from '@/hooks/useLanguage'
import Link from 'next/link'

export default function ResetPasswordPage() {
  const router = useRouter()
  const { lang } = useLanguage()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [ready, setReady] = useState(false)
  const [expired, setExpired] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setReady(true)
    })

    // Таймаут: если событие не пришло за 10 сек — ссылка недействительна
    const timer = setTimeout(() => {
      setExpired(true)
    }, 10000)

    return () => {
      subscription.unsubscribe()
      clearTimeout(timer)
    }
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirm) {
      setError(t(lang).auth.passwordsMismatch)
      return
    }
    if (password.length < 6) {
      setError(t(lang).auth.passwordTooShort)
      return
    }

    setLoading(true)
    setError('')

    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password })

    if (error) {
      setError(t(lang).auth.resetFailed)
      setLoading(false)
      return
    }

    router.push('/dashboard')
  }

  // Спиннер ожидания
  if (!ready && !expired) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--sim-bg)', padding: '24px' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 32, height: 32, border: '2px solid #2d6a4f', borderTopColor: 'transparent', borderRadius: '50%', margin: '0 auto 16px' }} className="animate-spin" />
          <p style={{ fontSize: '14px', color: 'var(--sim-text-hint)' }}>{t(lang).auth.verifyingLink}</p>
        </div>
      </div>
    )
  }

  // Ссылка недействительна
  if (expired && !ready) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--sim-bg)', padding: '24px' }}>
        <div style={{ textAlign: 'center', maxWidth: 360 }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', backgroundColor: 'rgba(220,38,38,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
            <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="#dc2626" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9.303 3.376c-.866 1.5-3.032 1.5-3.898 0L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374z" />
            </svg>
          </div>
          <h1 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: '24px', fontWeight: 400, color: 'var(--sim-forest)', marginBottom: '12px' }}>
            {lang === 'ru' ? 'Ссылка недействительна' : 'Link expired'}
          </h1>
          <p style={{ fontSize: '14px', color: 'var(--sim-text-hint)', marginBottom: '24px', lineHeight: 1.6 }}>
            {lang === 'ru' ? 'Ссылка для сброса пароля истекла или уже была использована. Запросите новую.' : 'The password reset link has expired or was already used. Request a new one.'}
          </p>
          <Link href="/forgot-password" style={{ fontSize: '14px', color: 'var(--sim-green)', fontWeight: 500, textDecoration: 'underline' }}>
            {lang === 'ru' ? 'Запросить новую ссылку' : 'Request new link'}
          </Link>
        </div>
      </div>
    )
  }

  // Форма сброса пароля (в фирменном стиле)
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--sim-bg)', padding: '24px' }}>
      <div style={{ width: '100%', maxWidth: 360 }}>
        {/* Логотип */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '32px' }}>
          <svg width="26" height="26" viewBox="0 0 36 36" fill="none" aria-hidden="true">
            <ellipse cx="13" cy="18" rx="7" ry="11" transform="rotate(-15 13 18)" fill="#7dd4a8" opacity="0.9"/>
            <ellipse cx="23" cy="18" rx="7" ry="11" transform="rotate(15 23 18)" fill="#f7f3ed" opacity="0.45"/>
            <path d="M18 8 Q18 18 18 28" stroke="#1a3020" strokeWidth="0.8" strokeLinecap="round"/>
          </svg>
          <span style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: '20px', fontWeight: 400, color: 'var(--sim-forest)' }}>Similia</span>
        </div>

        <h1 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: '28px', fontWeight: 400, color: 'var(--sim-forest)', marginBottom: '6px' }}>
          {t(lang).auth.newPassword}
        </h1>
        <p style={{ fontSize: '14px', color: 'var(--sim-text-hint)', marginBottom: '32px' }}>
          {t(lang).auth.newPasswordHint}
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <label htmlFor="new-password" style={{ display: 'block', fontSize: '12px', fontWeight: 500, letterSpacing: '0.08em', color: '#5a7060', marginBottom: '6px', textTransform: 'uppercase' as const }}>
              {t(lang).auth.newPassword}
            </label>
            <input
              id="new-password"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              autoFocus
              placeholder={t(lang).auth.minChars}
              style={{ width: '100%', backgroundColor: '#faf7f2', border: '1px solid var(--sim-border)', borderRadius: '8px', padding: '12px 16px', fontSize: '16px', color: '#3a2e1a', outline: 'none', boxSizing: 'border-box' as const }}
            />
          </div>

          <div>
            <label htmlFor="confirm-password" style={{ display: 'block', fontSize: '12px', fontWeight: 500, letterSpacing: '0.08em', color: '#5a7060', marginBottom: '6px', textTransform: 'uppercase' as const }}>
              {t(lang).auth.confirmPassword}
            </label>
            <input
              id="confirm-password"
              type="password"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              required
              placeholder="••••••••"
              style={{ width: '100%', backgroundColor: '#faf7f2', border: '1px solid var(--sim-border)', borderRadius: '8px', padding: '12px 16px', fontSize: '16px', color: '#3a2e1a', outline: 'none', boxSizing: 'border-box' as const }}
            />
          </div>

          {error && (
            <div role="alert" style={{ backgroundColor: '#fef0f0', border: '1px solid #fbd5d5', borderRadius: '8px', padding: '12px 16px' }}>
              <p style={{ color: '#c0392b', fontSize: '14px' }}>{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{ width: '100%', backgroundColor: loading ? '#5a7060' : '#1a3020', color: '#f7f3ed', border: 'none', borderRadius: '8px', padding: '13px 20px', fontSize: '15px', fontWeight: 500, cursor: loading ? 'default' : 'pointer', opacity: loading ? 0.7 : 1 }}
          >
            {loading ? t(lang).common.saving : t(lang).auth.savePassword}
          </button>
        </form>
      </div>
    </div>
  )
}
