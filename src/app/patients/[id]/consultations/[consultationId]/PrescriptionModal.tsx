'use client'

import { useState } from 'react'
import { savePrescription } from '@/lib/actions/consultations'

// Часто используемые потенции в гомеопатии
const POTENCY_CHIPS = ['6C', '12C', '30C', '200C', '1M', '10M', 'LM1', 'LM2', 'LM3']

type Props = {
  consultationId: string
  onSkip: () => void          // закрыть без назначения → навигация
  onSaved: () => void         // сохранили → навигация
}

export default function PrescriptionModal({ consultationId, onSkip, onSaved }: Props) {
  const [remedy, setRemedy] = useState('')
  const [potency, setPotency] = useState('')
  const [pellets, setPellets] = useState<number | null>(null)
  const [dosage, setDosage] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    if (!remedy.trim()) return
    setSaving(true)
    await savePrescription(consultationId, remedy.trim(), potency.trim(), pellets, dosage.trim())
    setSaving(false)
    onSaved()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl shadow-black/20 w-full max-w-md mx-4 overflow-hidden">

        {/* Шапка */}
        <div className="px-6 pt-5 pb-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0">
              <svg className="w-4.5 h-4.5 text-emerald-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-900">Назначение препарата</h2>
              <p className="text-xs text-gray-400">Можно заполнить позже в карточке консультации</p>
            </div>
          </div>
        </div>

        {/* Форма */}
        <div className="px-6 py-5 space-y-4">

          {/* Препарат */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
              Препарат
            </label>
            <input
              autoFocus
              type="text"
              value={remedy}
              onChange={e => setRemedy(e.target.value)}
              placeholder="Например: Sulphur, Pulsatilla..."
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-500/10 transition-all"
            />
          </div>

          {/* Потенция */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
              Потенция
            </label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {POTENCY_CHIPS.map(p => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPotency(potency === p ? '' : p)}
                  className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition-all ${
                    potency === p
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                      : 'border-gray-200 text-gray-600 hover:border-emerald-300 hover:text-emerald-700 hover:bg-emerald-50'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
            <input
              type="text"
              value={potency}
              onChange={e => setPotency(e.target.value)}
              placeholder="Или введите вручную..."
              className="w-full border border-gray-200 rounded-xl px-4 py-2 text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-500/10 transition-all"
            />
          </div>

          {/* Количество горошинок */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
              Количество горошинок
            </label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5, 6, 7].map(n => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setPellets(pellets === n ? null : n)}
                  className={`w-9 h-9 rounded-xl border text-sm font-semibold transition-all ${
                    pellets === n
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                      : 'border-gray-200 text-gray-600 hover:border-emerald-300 hover:text-emerald-700 hover:bg-emerald-50'
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          {/* Схема приёма */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
              Схема приёма
            </label>
            <textarea
              value={dosage}
              onChange={e => setDosage(e.target.value)}
              rows={2}
              placeholder="Например: однократно, повтор при возвращении симптомов..."
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 placeholder-gray-300 resize-none focus:outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-500/10 transition-all"
            />
          </div>
        </div>

        {/* Кнопки */}
        <div className="px-6 pb-5 flex items-center gap-3">
          <button
            onClick={handleSave}
            disabled={saving || !remedy.trim()}
            className="flex-1 bg-emerald-600 text-white text-sm font-semibold py-2.5 rounded-xl hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-sm"
          >
            {saving ? 'Сохраняю...' : 'Выписать и завершить'}
          </button>
          <button
            onClick={onSkip}
            className="text-sm text-gray-400 hover:text-gray-700 px-4 py-2.5 rounded-xl hover:bg-gray-50 transition-all"
          >
            Позже
          </button>
        </div>
      </div>
    </div>
  )
}
