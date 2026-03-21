'use client'

import { useState, useTransition, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { addPaidSessions, getPaymentHistory } from '@/lib/actions/payments'
import { useToast } from '@/components/ui/toast'
import { t } from '@/lib/i18n'
import { useLanguage } from '@/hooks/useLanguage'

type Props = {
  patientId: string
  initialCount: number
}

function formatHistoryDate(iso: string) {
  return new Date(iso).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })
}

export default function PaidSessionsBlock({ patientId, initialCount }: Props) {
  const router = useRouter()
  const { toast } = useToast()
  const { lang } = useLanguage()
  const [count, setCount] = useState(initialCount)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [history, setHistory] = useState<{ id: string; amount: number; note: string | null; created_at: string }[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [addAmount, setAddAmount] = useState(5)
  const [addNote, setAddNote] = useState('')
  const [isPending, startAdd] = useTransition()
  const historyRef = useRef<HTMLDivElement>(null)

  // Цветовое кодирование
  const color = count === 0 ? '#c0392b' : count <= 2 ? '#c8a035' : '#2d6a4f'
  const statusText = count === 0 ? t(lang).paidSessions.noPaid : count <= 2 ? t(lang).paidSessions.running_low : t(lang).paidSessions.remaining

  // Закрытие модалки по Escape
  useEffect(() => {
    if (!showAddModal) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') { setShowAddModal(false); setAddAmount(5); setAddNote('') } }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [showAddModal])

  // Закрыть дропдаун истории по клику вне
  useEffect(() => {
    if (!showHistory) return
    function handleClick(e: MouseEvent) {
      if (!historyRef.current?.contains(e.target as Node)) setShowHistory(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [showHistory])

  async function handleOpenHistory() {
    if (showHistory) { setShowHistory(false); return }
    setHistoryLoading(true)
    setShowHistory(true)
    const data = await getPaymentHistory(patientId)
    setHistory(data)
    setHistoryLoading(false)
  }

  function handleAdd() {
    startAdd(async () => {
      await addPaidSessions(patientId, addAmount, addNote)
      setCount(prev => prev + addAmount)
      setShowAddModal(false)
      setAddAmount(5)
      setAddNote('')
      toast(t(lang).paidSessions.added(addAmount))
      router.refresh()
    })
  }

  return (
    <>
      <div
        className="rounded-2xl px-4 py-4 mb-5"
        style={{ backgroundColor: '#f0ebe3', border: '1px solid var(--sim-border)' }}
      >
        <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--sim-text-hint)' }}>
          {t(lang).paidSessions.paidConsultations}
        </p>

        {/* Счётчик */}
        <div className="flex items-end justify-between">
          <div>
            <p
              className="text-[48px] font-light leading-none"
              style={{ fontFamily: 'var(--font-cormorant, Georgia, serif)', color }}
            >
              {count}
            </p>
            <p className="text-[13px] mt-1 font-medium" style={{ color }}>
              {statusText}
            </p>
          </div>

          {/* Кнопки */}
          <div className="flex items-center gap-2 relative" ref={historyRef}>
            <button
              onClick={() => setShowAddModal(true)}
              className="text-sm font-medium px-4 py-2 rounded-xl transition-colors"
              style={{ backgroundColor: 'var(--sim-green)', color: '#fff' }}
            >
              {t(lang).paidSessions.add}
            </button>
            <button
              onClick={handleOpenHistory}
              className="text-sm font-medium px-4 py-2 rounded-xl border transition-colors hover:opacity-80"
              style={{ border: '1px solid var(--sim-border)', color: 'var(--sim-text-sec)', backgroundColor: '#faf7f2' }}
            >
              {t(lang).paidSessions.history}
            </button>

            {/* Дропдаун истории */}
            {showHistory && (
              <div
                className="absolute right-0 top-full mt-2 w-72 rounded-xl shadow-xl z-30 overflow-hidden"
                style={{ backgroundColor: '#f0ebe3', border: '1px solid var(--sim-border)' }}
              >
                <p className="px-4 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--sim-text-hint)', borderBottom: '1px solid #d4c9b8' }}>
                  {t(lang).paidSessions.last10}
                </p>
                {historyLoading ? (
                  <p className="px-4 py-4 text-sm" style={{ color: 'var(--sim-text-hint)' }}>{t(lang).paidSessions.loading}</p>
                ) : history.length === 0 ? (
                  <p className="px-4 py-4 text-sm" style={{ color: 'var(--sim-text-hint)' }}>{t(lang).paidSessions.noRecords}</p>
                ) : (
                  <div className="divide-y" style={{ borderColor: '#e8e0d4' }}>
                    {history.map(entry => (
                      <div key={entry.id} className="flex items-center justify-between px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <span
                            className="text-sm font-semibold w-8"
                            style={{ color: entry.amount > 0 ? '#2d6a4f' : '#c0392b' }}
                          >
                            {entry.amount > 0 ? `+${entry.amount}` : entry.amount}
                          </span>
                          <span className="text-sm" style={{ color: 'var(--sim-text-sec)' }}>
                            {entry.note || '—'}
                          </span>
                        </div>
                        <span className="text-[12px]" style={{ color: 'var(--sim-text-hint)' }}>
                          {formatHistoryDate(entry.created_at)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Модалка "+ Добавить" */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={(e) => { if (e.target === e.currentTarget) { setShowAddModal(false); setAddAmount(5); setAddNote('') } }}>
          <div
            className="relative rounded-2xl p-6 w-[320px] mx-4 shadow-2xl"
            style={{ backgroundColor: 'var(--sim-bg)', border: '0.5px solid #d4c9b8' }}
          >
            <h2
              className="text-lg font-light mb-4"
              style={{ fontFamily: 'var(--font-cormorant, Georgia, serif)', color: '#1a1a0a' }}
            >
              {t(lang).paidSessions.addTitle}
            </h2>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--sim-text-hint)' }}>
                  {t(lang).paidSessions.amount}
                </label>
                <div className="flex gap-2 mb-2">
                  {[1, 3, 5, 10].map(n => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setAddAmount(n)}
                      className="flex-1 py-2 rounded-xl text-sm font-semibold border transition-all"
                      style={addAmount === n
                        ? { backgroundColor: 'var(--sim-green)', color: '#fff', borderColor: '#2d6a4f' }
                        : { backgroundColor: '#faf7f2', color: 'var(--sim-text-sec)', borderColor: 'var(--sim-border)' }}
                    >
                      {n}
                    </button>
                  ))}
                </div>
                <input
                  type="number"
                  min={1}
                  value={addAmount}
                  onChange={e => setAddAmount(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2d6a4f]/30"
                  style={{ backgroundColor: '#faf7f2', borderColor: 'var(--sim-border)', color: '#1a1a0a' }}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--sim-text-hint)' }}>
                  {t(lang).paidSessions.note}
                </label>
                <input
                  type="text"
                  value={addNote}
                  onChange={e => setAddNote(e.target.value)}
                  placeholder={t(lang).paidSessions.notePlaceholder}
                  className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2d6a4f]/30"
                  style={{ backgroundColor: '#faf7f2', borderColor: 'var(--sim-border)', color: '#1a1a0a' }}
                />
              </div>
            </div>

            <div className="flex gap-2 mt-5">
              <button
                onClick={handleAdd}
                disabled={isPending}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed"
                style={{ backgroundColor: 'var(--sim-green)' }}
              >
                {isPending ? t(lang).paidSessions.saving : t(lang).paidSessions.save}
              </button>
              <button
                onClick={() => { setShowAddModal(false); setAddAmount(5); setAddNote('') }}
                className="px-4 py-2.5 rounded-xl text-sm transition-colors hover:opacity-70"
                style={{ color: 'var(--sim-text-hint)' }}
              >
                {t(lang).paidSessions.cancel}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
