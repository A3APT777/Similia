'use client'

import { useState, useEffect } from 'react'

export default function WelcomeScreen() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!localStorage.getItem('welcome_shown')) {
      // Показываем с небольшой задержкой для плавности
      setTimeout(() => setVisible(true), 500)
    }
  }, [])

  function handleStart() {
    localStorage.setItem('welcome_shown', '1')
    setVisible(false)
    // Запускаем интерактивный тур
    localStorage.setItem('onboarding_step', '0')
    window.location.reload()
  }

  function handleSkip() {
    localStorage.setItem('welcome_shown', '1')
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(26,48,32,0.85)', backdropFilter: 'blur(8px)' }}
    >
      <div
        className="max-w-md w-full rounded-2xl p-8 text-center"
        style={{
          backgroundColor: 'var(--sim-bg)',
          boxShadow: '0 24px 64px rgba(0,0,0,0.3)',
          animation: 'welcomeFadeIn 0.4s ease both',
        }}
      >
        {/* Логотип */}
        <div className="flex items-center justify-center gap-2 mb-6">
          <svg width={36} height={36} viewBox="0 0 36 36" fill="none">
            <ellipse cx="13" cy="18" rx="7" ry="11" transform="rotate(-15 13 18)" fill="#2d6a4f" opacity="0.9" />
            <ellipse cx="23" cy="18" rx="7" ry="11" transform="rotate(15 23 18)" fill="#1a3020" opacity="0.65" />
          </svg>
          <span style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: '24px', fontWeight: 400, color: 'var(--sim-forest)' }}>
            Similia
          </span>
        </div>

        <h1
          className="text-2xl mb-3"
          style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", color: 'var(--sim-forest)', fontWeight: 400 }}
        >
          Добро пожаловать!
        </h1>

        <p className="text-sm mb-2 leading-relaxed" style={{ color: 'var(--sim-text-sec)' }}>
          Similia — ваш цифровой кабинет гомеопата.
        </p>
        <p className="text-sm mb-8 leading-relaxed" style={{ color: 'var(--sim-text-hint)' }}>
          Карточки пациентов, реперторий Кента, анкеты и опросы — всё в одном месте. Давайте покажем как это работает.
        </p>

        <div className="space-y-3">
          <button
            onClick={handleStart}
            className="w-full py-3.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90"
            style={{ backgroundColor: 'var(--sim-green)' }}
          >
            Начать знакомство →
          </button>
          <button
            onClick={handleSkip}
            className="w-full py-2.5 text-sm transition-colors"
            style={{ color: 'var(--sim-text-hint)' }}
          >
            Пропустить
          </button>
        </div>

        <p className="text-xs mt-6" style={{ color: '#c4b89a' }}>
          Вы сможете повторить обучение в любой момент
        </p>
      </div>

      <style>{`
        @keyframes welcomeFadeIn {
          from { opacity: 0; transform: scale(0.95) translateY(10px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
    </div>
  )
}
