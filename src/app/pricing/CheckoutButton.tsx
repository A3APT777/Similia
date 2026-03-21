'use client'

import { useState } from 'react'

type Plan = 'standard' | 'ai_pro' | 'ai_pack_5' | 'ai_pack_15' | 'ai_pack_50'

type Props = {
  plan?: Plan
  period?: 'monthly' | 'yearly'
  label: string
  className?: string
  style?: React.CSSProperties
}

export default function CheckoutButton({ plan = 'standard', period, label, className, style }: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleCheckout() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan, period }),
      })

      const data = await res.json()

      if (!res.ok) {
        if (res.status === 401) {
          window.location.href = '/login'
          return
        }
        setError(data.error || 'Ошибка при создании платежа')
        return
      }

      // Редирект на страницу оплаты ЮKassa
      window.location.href = data.confirmation_url
    } catch {
      setError('Ошибка соединения')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <button
        onClick={handleCheckout}
        disabled={loading}
        className={`${className} disabled:opacity-50 disabled:cursor-not-allowed`}
        style={style}
      >
        {loading ? 'Перенаправляем...' : label}
      </button>
      {error && (
        <p className="text-xs text-red-500 mt-2 text-center">{error}</p>
      )}
    </div>
  )
}
