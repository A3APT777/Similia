'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { seedDemoData } from '@/lib/actions/seed'

export default function WelcomeScreen() {
  const [visible, setVisible] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  useEffect(() => {
    if (!localStorage.getItem('welcome_shown') && !localStorage.getItem('tour_completed')) {
      setTimeout(() => setVisible(true), 500)
    }
  }, [])

  function handleAddPatient() {
    localStorage.setItem('welcome_shown', '1')
    setVisible(false)
    router.push('/patients/new')
  }

  async function handleDemo() {
    setLoading(true)
    try {
      await seedDemoData()
      localStorage.setItem('welcome_shown', '1')
      setVisible(false)
      window.location.reload()
    } catch {
      setLoading(false)
    }
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
        className="max-w-sm w-full rounded-2xl p-8 text-center"
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
          Ваш кабинет готов!
        </h1>

        <p className="text-sm mb-8 leading-relaxed" style={{ color: 'var(--sim-text-sec)' }}>
          Начните с добавления первого пациента или потренируйтесь на примерах.
        </p>

        <div className="space-y-3">
          <button
            onClick={handleAddPatient}
            className="btn btn-primary w-full py-3.5"
          >
            Добавить первого пациента
          </button>
          <button
            onClick={handleDemo}
            disabled={loading}
            className="w-full py-2.5 text-sm font-medium transition-colors disabled:opacity-50"
            style={{ color: 'var(--sim-green)' }}
          >
            {loading ? 'Создаю примеры...' : 'Потренироваться на примере →'}
          </button>
        </div>

        <button
          onClick={handleSkip}
          className="text-xs mt-6 transition-colors"
          style={{ color: '#c4b89a' }}
        >
          Пропустить
        </button>
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
