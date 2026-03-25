'use client'

import { useState, useTransition } from 'react'
import { savePrescriptionRules } from '@/lib/actions/prescriptionShare'
import { DEFAULT_PRESCRIPTION_RULES } from '@/lib/prescriptionDefaults'
import { useToast } from '@/components/ui/toast'

export default function PrescriptionRulesEditor({ initialRules }: { initialRules: string }) {
  const [rules, setRules] = useState(initialRules)
  const [isPending, startTransition] = useTransition()
  const { toast } = useToast()

  function handleSave() {
    startTransition(async () => {
      try {
        await savePrescriptionRules(rules)
        toast('Правила сохранены', 'success')
      } catch {
        toast('Ошибка при сохранении', 'error')
      }
    })
  }

  function handleReset() {
    setRules(DEFAULT_PRESCRIPTION_RULES)
  }

  return (
    <div className="space-y-3">
      <textarea
        value={rules}
        onChange={e => setRules(e.target.value)}
        rows={14}
        className="w-full rounded-xl border px-4 py-3 text-sm leading-relaxed resize-none focus:outline-none transition-all duration-200"
        style={{ borderColor: 'var(--sim-border)', color: 'var(--sim-text)', backgroundColor: 'var(--sim-bg-card)' }}
        onFocus={e => { e.currentTarget.style.borderColor = 'var(--sim-green)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(45,106,79,0.08)' }}
        onBlur={e => { e.currentTarget.style.borderColor = 'var(--sim-border)'; e.currentTarget.style.boxShadow = 'none' }}
      />
      <div className="flex gap-2">
        <button
          onClick={handleSave}
          disabled={isPending}
          className="btn btn-primary btn-sm"
        >
          {isPending ? 'Сохраняю...' : 'Сохранить правила'}
        </button>
        <button
          onClick={handleReset}
          className="px-4 py-2 rounded-full text-sm text-gray-500 hover:text-gray-700 transition-colors"
          style={{ border: '1px solid var(--sim-border)' }}
        >
          Сбросить к стандартным
        </button>
      </div>
      <p className="text-xs" style={{ color: 'var(--sim-text-hint)' }}>
        Этот текст будет отображаться пациенту вместе с назначением
      </p>
    </div>
  )
}
