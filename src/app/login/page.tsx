'use client'

import { useState, useActionState } from 'react'
import Link from 'next/link'
import { t } from '@/lib/i18n'
import { useLanguage } from '@/hooks/useLanguage'
import { loginAction } from './actions'

const inputStyle: React.CSSProperties = {
  width: '100%',
  backgroundColor: '#faf7f2',
  border: '1px solid #d4c9b8',
  borderRadius: '8px',
  padding: '12px 16px',
  fontSize: '16px',
  color: '#3a2e1a',
  outline: 'none',
  boxSizing: 'border-box',
  transition: 'border-color 0.15s, box-shadow 0.15s',
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '12px',
  fontWeight: 500,
  letterSpacing: '0.08em',
  color: '#5a7060',
  marginBottom: '6px',
  textTransform: 'uppercase',
}

export default function LoginPage() {
  const { lang } = useLanguage()
  const [serverError, formAction, isPending] = useActionState(loginAction, null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [focusedField, setFocusedField] = useState<string | null>(null)


  const error = serverError ? t(lang).auth.invalidCredentials : ''

  const getInputStyle = (field: string): React.CSSProperties => ({
    ...inputStyle,
    borderColor: focusedField === field ? '#2d6a4f' : '#d4c9b8',
    boxShadow: focusedField === field ? '0 0 0 3px rgba(45,106,79,0.1)' : 'none',
  })

  return (
    <div style={{ minHeight: '100vh', display: 'flex', backgroundColor: '#f7f3ed' }}>

      {/* Левая панель */}
      <div style={{
        display: 'none',
        width: '45%',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '48px',
        position: 'relative',
        overflow: 'hidden',
        backgroundColor: '#1a3020',
        flexShrink: 0,
      }} className="auth-left-panel">
        {/* Ботаническая иллюстрация */}
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
            {t(lang).auth.loginHero.split('\n').map((line, i, arr) => (
              <span key={i}>{line}{i < arr.length - 1 && <br />}</span>
            ))}
          </h2>
          <p style={{ fontSize: '14px', lineHeight: 1.65, color: 'rgba(255,255,255,0.45)' }}>
            {t(lang).auth.loginHeroDesc}
          </p>
        </div>

        {/* Галочки и цитата */}
        <div style={{ position: 'relative', zIndex: 10 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '24px' }}>
            {t(lang).auth.features.map(f => (
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
        backgroundColor: '#f7f3ed',
      }}>
        <div style={{ width: '100%', maxWidth: '360px' }}>

          {/* Мобильный логотип */}
          <div className="auth-mobile-logo" style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '32px' }}>
            <svg width="26" height="26" viewBox="0 0 36 36" fill="none">
              <ellipse cx="13" cy="18" rx="7" ry="11" transform="rotate(-15 13 18)" fill="#7dd4a8" opacity="0.9"/>
              <ellipse cx="23" cy="18" rx="7" ry="11" transform="rotate(15 23 18)" fill="#f7f3ed" opacity="0.45"/>
              <path d="M18 8 Q18 18 18 28" stroke="#1a3020" strokeWidth="0.8" strokeLinecap="round"/>
            </svg>
            <span style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: '20px', fontWeight: 400, color: '#1a3020' }}>
              Similia
            </span>
          </div>

          <h1 style={{
            fontFamily: "'Cormorant Garamond', Georgia, serif",
            fontSize: '28px',
            fontWeight: 400,
            color: '#1a3020',
            marginBottom: '6px',
          }}>
            {t(lang).auth.welcome}
          </h1>
          <p style={{ fontSize: '15px', color: '#9a8a6a', marginBottom: '32px' }}>
            {t(lang).auth.signInPrompt}
          </p>

          <form action={formAction} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <label style={labelStyle}>Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onFocus={() => setFocusedField('email')}
                onBlur={() => setFocusedField(null)}
                required
                autoFocus
                name="email"
                placeholder="doctor@example.com"
                style={getInputStyle('email')}
              />
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                <label style={{ ...labelStyle, marginBottom: 0 }}>{t(lang).auth.password}</label>
                <Link href="/forgot-password" style={{ fontSize: '14px', color: '#2d6a4f', textDecoration: 'none' }}>
                  {t(lang).auth.forgotPassword}
                </Link>
              </div>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                onFocus={() => setFocusedField('password')}
                onBlur={() => setFocusedField(null)}
                name="password"
                required
                placeholder="••••••••"
                style={getInputStyle('password')}
              />
            </div>

            {error && (
              <div style={{ backgroundColor: '#fef0f0', border: '1px solid #fbd5d5', borderRadius: '8px', padding: '12px 16px' }}>
                <p style={{ color: '#c0392b', fontSize: '14px' }}>{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={isPending}
              style={{
                width: '100%',
                backgroundColor: isPending ? '#5a7060' : '#1a3020',
                color: '#f7f3ed',
                border: 'none',
                borderRadius: '8px',
                padding: '13px 20px',
                fontSize: '15px',
                fontWeight: 500,
                cursor: isPending ? 'default' : 'pointer',
                transition: 'background-color 0.15s',
                opacity: isPending ? 0.7 : 1,
              }}
              onMouseEnter={e => { if (!isPending) e.currentTarget.style.backgroundColor = '#2d6a4f' }}
              onMouseLeave={e => { if (!isPending) e.currentTarget.style.backgroundColor = '#1a3020' }}
            >
              {isPending ? t(lang).auth.signingIn : t(lang).auth.signIn}
            </button>
          </form>

          <p style={{ marginTop: '24px', fontSize: '14px', color: '#9a8a6a', textAlign: 'center' }}>
            {t(lang).auth.noAccount}{' '}
            <Link href="/register" style={{ color: '#2d6a4f', fontWeight: 500, textDecoration: 'none' }}>
              {t(lang).auth.register}
            </Link>
          </p>

          <p style={{ marginTop: '16px', fontSize: '12px', color: '#9a8a6a', textAlign: 'center' }}>
            {t(lang).auth.freeAndSecure}
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
