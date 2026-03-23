'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { t } from '@/lib/i18n'
import { useLanguage } from '@/hooks/useLanguage'

import { authInputStyle as inputStyle, authLabelStyle as labelStyle, getAuthInputFocusStyle } from '@/lib/authStyles'

export default function ForgotPasswordPage() {
  const { lang } = useLanguage()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const [focused, setFocused] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    })
    if (error) {
      setError(t(lang).auth.resetError)
      setLoading(false)
      return
    }
    setSent(true)
    setLoading(false)
  }

  if (sent) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--sim-bg)', padding: '24px' }}>
        <div style={{ width: '100%', maxWidth: '360px', textAlign: 'center' }}>
          <div style={{
            width: '56px', height: '56px', borderRadius: '16px',
            backgroundColor: 'rgba(125,212,168,0.15)',
            border: '1px solid rgba(125,212,168,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 24px',
          }}>
            <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="#2d6a4f" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
            </svg>
          </div>
          <h1 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: '28px', fontWeight: 400, color: 'var(--sim-forest)', marginBottom: '12px' }}>
            {t(lang).auth.emailSent}
          </h1>
          <p style={{ fontSize: '15px', color: 'var(--sim-text-sec)', lineHeight: 1.6 }}>
            {t(lang).auth.checkEmail}
          </p>
          <p style={{ fontSize: '13px', color: 'var(--sim-text-hint)', marginTop: '12px' }}>
            {t(lang).auth.checkSpam}
          </p>
          <Link href="/login" style={{ display: 'inline-block', marginTop: '24px', fontSize: '14px', color: 'var(--sim-green)', fontWeight: 500, textDecoration: 'none' }}>
            {t(lang).auth.backToLogin}
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', backgroundColor: 'var(--sim-bg)' }}>

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
        <div style={{
          position: 'absolute',
          bottom: '-20px',
          right: '-20px',
          width: '280px',
          height: '280px',
          backgroundImage: 'url(/illustrations/belladonna.jpg)',
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

        <div style={{ position: 'relative', zIndex: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '48px' }}>
            <svg width="28" height="28" viewBox="0 0 36 36" fill="none">
              <ellipse cx="13" cy="18" rx="7" ry="11" transform="rotate(-15 13 18)" fill="#7dd4a8" opacity="0.9"/>
              <ellipse cx="23" cy="18" rx="7" ry="11" transform="rotate(15 23 18)" fill="#f7f3ed" opacity="0.45"/>
              <path d="M18 8 Q18 18 18 28" stroke="#1a3020" strokeWidth="0.8" strokeLinecap="round"/>
            </svg>
            <span style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: '20px', fontWeight: 400, color: '#f7f3ed', letterSpacing: '0.02em' }}>
              Similia
            </span>
          </div>

          <h2 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: '38px', fontWeight: 300, color: 'rgba(255,255,255,0.95)', lineHeight: 1.25, marginBottom: '16px' }}>
            {t(lang).auth.resetHero.split('\n').map((line, i, arr) => (
              <span key={i}>{line}{i < arr.length - 1 && <br />}</span>
            ))}
          </h2>
          <p style={{ fontSize: '14px', lineHeight: 1.65, color: 'rgba(255,255,255,0.45)' }}>
            {t(lang).auth.resetHeroDesc}
          </p>
        </div>

        <div style={{ position: 'relative', zIndex: 10, paddingTop: '20px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          <p style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: '17px', fontStyle: 'italic', color: 'rgba(255,255,255,0.5)', marginBottom: '4px' }}>
            «Similia similibus curantur»
          </p>
          <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.25)' }}>Ганеман, 1796</p>
        </div>
      </div>

      {/* Правая панель — форма */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px 24px', backgroundColor: 'var(--sim-bg)' }}>
        <div style={{ width: '100%', maxWidth: '360px' }}>

          {/* Мобильный логотип */}
          <div className="auth-mobile-logo" style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '32px' }}>
            <svg width="26" height="26" viewBox="0 0 36 36" fill="none">
              <ellipse cx="13" cy="18" rx="7" ry="11" transform="rotate(-15 13 18)" fill="#7dd4a8" opacity="0.9"/>
              <ellipse cx="23" cy="18" rx="7" ry="11" transform="rotate(15 23 18)" fill="#f7f3ed" opacity="0.45"/>
              <path d="M18 8 Q18 18 18 28" stroke="#1a3020" strokeWidth="0.8" strokeLinecap="round"/>
            </svg>
            <span style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: '20px', fontWeight: 400, color: 'var(--sim-forest)' }}>
              Similia
            </span>
          </div>

          <h1 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: '28px', fontWeight: 400, color: 'var(--sim-forest)', marginBottom: '6px' }}>
            {t(lang).auth.resetPassword}
          </h1>
          <p style={{ fontSize: '15px', color: 'var(--sim-text-hint)', marginBottom: '32px' }}>
            {t(lang).auth.resetPrompt}
          </p>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <label style={labelStyle}>Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                required
                autoFocus
                placeholder="doctor@example.com"
                style={{
                  ...inputStyle,
                  borderColor: focused ? '#2d6a4f' : 'var(--sim-border)',
                  boxShadow: focused ? '0 0 0 3px rgba(45,106,79,0.1)' : 'none',
                }}
              />
            </div>

            {error && (
              <div style={{ backgroundColor: '#fef0f0', border: '1px solid #fbd5d5', borderRadius: '8px', padding: '12px 16px' }}>
                <p style={{ color: '#c0392b', fontSize: '14px' }}>{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
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
              {loading ? t(lang).auth.sending : t(lang).auth.sendLink}
            </button>
          </form>

          <p style={{ marginTop: '24px', fontSize: '14px', color: 'var(--sim-text-hint)', textAlign: 'center' }}>
            <Link href="/login" style={{ color: 'var(--sim-green)', fontWeight: 500, textDecoration: 'none' }}>
              {t(lang).auth.backToLogin}
            </Link>
          </p>
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
