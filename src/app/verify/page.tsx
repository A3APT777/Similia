'use client'

import { useState, useRef, useEffect } from 'react'
import { signIn } from 'next-auth/react'
import Logo from '@/components/Logo'

export default function VerifyPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  useEffect(() => {
    setEmail(sessionStorage.getItem('verify_email') || '')
    setPassword(sessionStorage.getItem('verify_p') || '')
  }, [])

  const [code, setCode] = useState(['', '', '', '', '', ''])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  // Автофокус на первый инпут
  useEffect(() => {
    inputRefs.current[0]?.focus()
  }, [])

  function handleChange(index: number, value: string) {
    if (!/^\d*$/.test(value)) return // только цифры

    const newCode = [...code]
    newCode[index] = value.slice(-1) // одна цифра
    setCode(newCode)
    setError('')

    // Автопереход на следующий инпут
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus()
    }

    // Автоотправка когда все 6 цифр введены
    if (value && index === 5 && newCode.every(d => d)) {
      handleSubmit(newCode.join(''))
    }
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent) {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  // Вставка кода из буфера обмена
  function handlePaste(e: React.ClipboardEvent) {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (pasted.length === 6) {
      setCode(pasted.split(''))
      inputRefs.current[5]?.focus()
      handleSubmit(pasted)
    }
  }

  async function handleSubmit(codeStr?: string) {
    const fullCode = codeStr || code.join('')
    if (fullCode.length !== 6) return

    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code: fullCode }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Неверный код')
        setLoading(false)
        setCode(['', '', '', '', '', ''])
        inputRefs.current[0]?.focus()
        return
      }

      // Email подтверждён — входим
      const signInResult = await signIn('credentials', {
        email,
        password,
        redirect: false,
      })

      if (signInResult?.error) {
        // Верификация прошла, но вход не удался
        window.location.href = '/login'
        return
      }

      // Очищаем временные данные
      sessionStorage.removeItem('verify_email')
      sessionStorage.removeItem('verify_p')
      localStorage.removeItem('demo_banner_dismissed')
      window.location.href = '/dashboard'
    } catch {
      setError('Ошибка сети')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: 'var(--sim-bg)' }}>
      <div className="w-full max-w-[380px] text-center">

        <div className="flex justify-center mb-8">
          <Logo size={32} />
        </div>

        {/* Иконка конверта */}
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6" style={{ backgroundColor: 'rgba(45,106,79,0.08)' }}>
          <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="var(--sim-green)" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
          </svg>
        </div>

        <h1 className="heading-serif text-[28px] font-light mb-2" style={{ color: 'var(--sim-text)' }}>
          Подтвердите email
        </h1>
        <p className="text-[14px] mb-8" style={{ color: 'var(--sim-text-muted)' }}>
          Мы отправили 6-значный код на<br />
          <strong style={{ color: 'var(--sim-text)' }}>{email}</strong>
        </p>

        {/* 6 инпутов для кода */}
        <div className="flex justify-center gap-2 mb-6" onPaste={handlePaste}>
          {code.map((digit, i) => (
            <input
              key={i}
              ref={el => { inputRefs.current[i] = el }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={e => handleChange(i, e.target.value)}
              onKeyDown={e => handleKeyDown(i, e)}
              disabled={loading}
              className="w-12 h-14 text-center text-[24px] font-light rounded-xl outline-none transition-all duration-200 focus:ring-2 focus:ring-(--sim-green)/20 focus:border-(--sim-green)"
              style={{
                backgroundColor: 'rgba(255,255,255,0.6)',
                border: '1px solid rgba(0,0,0,0.08)',
                color: 'var(--sim-text)',
              }}
            />
          ))}
        </div>

        {error && (
          <p className="text-[13px] mb-4" style={{ color: 'var(--sim-red)' }}>{error}</p>
        )}

        {loading && (
          <p className="text-[13px] mb-4" style={{ color: 'var(--sim-text-muted)' }}>Проверяем...</p>
        )}

        <p className="text-[12px] mt-8" style={{ color: 'var(--sim-text-hint)' }}>
          Код действителен 15 минут. Проверьте папку «Спам».
        </p>
      </div>
    </div>
  )
}
