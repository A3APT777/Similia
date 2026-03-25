'use client'

import { useState } from 'react'
import { exportAllData } from '@/lib/actions/export'

export default function ExportDataSection() {
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')

  async function handleExport() {
    setStatus('loading')
    try {
      const result = await exportAllData()
      if (!result.success || !result.data) {
        setStatus('error')
        return
      }

      // Скачиваем JSON
      const blob = new Blob([JSON.stringify(result.data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `similia-export-${new Date().toISOString().split('T')[0]}.json`
      a.click()
      URL.revokeObjectURL(url)

      setStatus('done')
      setTimeout(() => setStatus('idle'), 3000)
    } catch {
      setStatus('error')
      setTimeout(() => setStatus('idle'), 3000)
    }
  }

  return (
    <section>
      <h2 className="text-[11px] font-medium uppercase tracking-[0.1em] mb-4" style={{ color: 'var(--sim-text-muted)' }}>
        Экспорт данных
      </h2>
      <div className="rounded-xl p-5" style={{ backgroundColor: 'var(--sim-bg-card)', border: '1px solid var(--sim-border)' }}>
        <p className="text-sm mb-4" style={{ color: 'var(--sim-text)', lineHeight: '1.6' }}>
          Скачайте все ваши данные в формате JSON. Файл содержит пациентов, консультации, анкеты и назначения.
        </p>
        <button
          onClick={handleExport}
          disabled={status === 'loading'}
          className="btn btn-secondary text-sm"
        >
          {status === 'idle' && 'Скачать мои данные'}
          {status === 'loading' && 'Подготовка данных...'}
          {status === 'done' && '✓ Данные скачаны'}
          {status === 'error' && 'Ошибка. Попробуйте ещё раз'}
        </button>
      </div>
    </section>
  )
}
