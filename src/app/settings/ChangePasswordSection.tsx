'use client'

import { useState } from 'react'
import { changePassword } from '@/lib/actions/admin'

export default function ChangePasswordSection() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [status, setStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password.length < 6) {
      setErrorMsg('Минимум 6 символов')
      setStatus('error')
      return
    }
    if (password !== confirm) {
      setErrorMsg('Пароли не совпадают')
      setStatus('error')
      return
    }

    setStatus('saving')
    try {
      await changePassword(password)
      setStatus('success')
      setPassword('')
      setConfirm('')
      setTimeout(() => setStatus('idle'), 3000)
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Ошибка')
      setStatus('error')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label className="block text-xs font-medium mb-1" style={{ color: 'var(--sim-text-sec)' }}>
          Новый пароль
        </label>
        <input
          type="password"
          value={password}
          onChange={e => { setPassword(e.target.value); setStatus('idle') }}
          placeholder="Минимум 6 символов"
          className="w-full rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2"
          style={{ backgroundColor: 'var(--sim-bg-input)', border: '1px solid var(--sim-border)', color: 'var(--sim-text)' }}
        />
      </div>
      <div>
        <label className="block text-xs font-medium mb-1" style={{ color: 'var(--sim-text-sec)' }}>
          Подтвердите пароль
        </label>
        <input
          type="password"
          value={confirm}
          onChange={e => { setConfirm(e.target.value); setStatus('idle') }}
          placeholder="Повторите пароль"
          className="w-full rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2"
          style={{ backgroundColor: 'var(--sim-bg-input)', border: '1px solid var(--sim-border)', color: 'var(--sim-text)' }}
        />
      </div>

      {status === 'error' && (
        <p className="text-xs text-red-600">{errorMsg}</p>
      )}
      {status === 'success' && (
        <p className="text-xs" style={{ color: 'var(--sim-green)' }}>✓ Пароль изменён</p>
      )}

      <button
        type="submit"
        disabled={status === 'saving' || !password || !confirm}
        className="btn btn-primary btn-sm"
      >
        {status === 'saving' ? 'Сохраняю...' : 'Сменить пароль'}
      </button>
    </form>
  )
}
