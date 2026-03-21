'use client'

import { useState } from 'react'

type Stats = {
  code: string
  totalInvited: number
  totalPaid: number
  totalBonusDays: number
  maxBonusDays: number
  invitations: Array<{
    created_at: string
    bonus_applied: boolean
    referrer_bonus_days: number
  }>
}

export default function ReferralClient({ stats }: { stats: Stats }) {
  const [copied, setCopied] = useState(false)

  const link = `https://simillia.ru?r=${stats.code}`

  async function handleCopy() {
    await navigator.clipboard.writeText(link)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const progressPct = Math.min(100, (stats.totalBonusDays / stats.maxBonusDays) * 100)

  return (
    <div className="space-y-6">
      {/* Ссылка */}
      <div className="rounded-2xl p-5" style={{ backgroundColor: 'var(--sim-forest)' }}>
        <p className="text-xs uppercase tracking-wider mb-3" style={{ color: 'rgba(255,255,255,0.5)' }}>Ваша ссылка</p>
        <div className="flex items-center gap-2">
          <input
            readOnly
            value={link}
            className="flex-1 text-sm bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white truncate focus:outline-none"
          />
          <button
            onClick={handleCopy}
            className="shrink-0 px-5 py-3 rounded-xl text-sm font-semibold transition-all"
            style={{ backgroundColor: copied ? '#16a34a' : '#c8a035', color: 'var(--sim-forest)' }}
          >
            {copied ? '✓ Скопировано' : 'Копировать'}
          </button>
        </div>
        <p className="text-xs mt-2" style={{ color: 'rgba(255,255,255,0.4)' }}>
          Отправьте эту ссылку коллеге-гомеопату
        </p>
      </div>

      {/* Как работает */}
      <div className="rounded-2xl p-5" style={{ backgroundColor: 'white', border: '1px solid var(--sim-border)' }}>
        <h2 className="text-sm font-semibold uppercase tracking-wider mb-4" style={{ color: 'var(--sim-text-hint)' }}>Как это работает</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { step: '01', title: 'Отправьте ссылку', desc: 'Скопируйте и отправьте ссылку коллеге в мессенджер' },
            { step: '02', title: 'Коллега регистрируется', desc: 'Переходит по ссылке, регистрируется и оплачивает подписку' },
            { step: '03', title: 'Оба получают бонус', desc: 'Вам +7 дней Стандарта, коллеге +14 дней' },
          ].map(s => (
            <div key={s.step} className="text-center">
              <div className="w-8 h-8 rounded-full flex items-center justify-center mx-auto mb-2 text-xs font-bold text-white" style={{ backgroundColor: 'var(--sim-green)' }}>
                {s.step}
              </div>
              <p className="text-sm font-medium mb-1" style={{ color: 'var(--sim-forest)' }}>{s.title}</p>
              <p className="text-xs" style={{ color: 'var(--sim-text-hint)' }}>{s.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Бонусы */}
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-2xl p-5 text-center" style={{ backgroundColor: 'rgba(45,106,79,0.06)', border: '1px solid rgba(45,106,79,0.15)' }}>
          <p className="text-2xl font-light mb-1" style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", color: 'var(--sim-green)' }}>+7</p>
          <p className="text-xs" style={{ color: 'var(--sim-text-hint)' }}>дней вам</p>
        </div>
        <div className="rounded-2xl p-5 text-center" style={{ backgroundColor: 'rgba(200,160,53,0.08)', border: '1px solid rgba(200,160,53,0.2)' }}>
          <p className="text-2xl font-light mb-1" style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", color: 'var(--sim-amber)' }}>+14</p>
          <p className="text-xs" style={{ color: 'var(--sim-text-hint)' }}>дней коллеге</p>
        </div>
      </div>

      {/* Статистика */}
      <div className="rounded-2xl p-5" style={{ backgroundColor: 'white', border: '1px solid var(--sim-border)' }}>
        <h2 className="text-sm font-semibold uppercase tracking-wider mb-4" style={{ color: 'var(--sim-text-hint)' }}>Ваша статистика</h2>
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="text-center">
            <p className="text-2xl font-light" style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", color: 'var(--sim-forest)' }}>{stats.totalInvited}</p>
            <p className="text-xs" style={{ color: 'var(--sim-text-hint)' }}>Приглашено</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-light" style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", color: 'var(--sim-green)' }}>{stats.totalPaid}</p>
            <p className="text-xs" style={{ color: 'var(--sim-text-hint)' }}>Оплатили</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-light" style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", color: 'var(--sim-amber)' }}>{stats.totalBonusDays}</p>
            <p className="text-xs" style={{ color: 'var(--sim-text-hint)' }}>Дней заработано</p>
          </div>
        </div>

        {/* Прогресс */}
        <div>
          <div className="flex justify-between text-xs mb-1" style={{ color: 'var(--sim-text-hint)' }}>
            <span>Бонусных дней</span>
            <span>{stats.totalBonusDays} / {stats.maxBonusDays}</span>
          </div>
          <div className="h-2 rounded-full" style={{ backgroundColor: '#f0ebe3' }}>
            <div
              className="h-2 rounded-full transition-all duration-500"
              style={{ width: `${progressPct}%`, backgroundColor: progressPct >= 100 ? '#c8a035' : '#2d6a4f' }}
            />
          </div>
        </div>
      </div>

      {/* Список приглашений */}
      {stats.invitations.length > 0 && (
        <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--sim-border)' }}>
          <div className="px-5 py-3" style={{ backgroundColor: '#f0ebe3' }}>
            <h2 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--sim-text-hint)' }}>История приглашений</h2>
          </div>
          <div className="divide-y divide-[#f0ebe3]">
            {stats.invitations.map((inv, i) => (
              <div key={i} className="px-5 py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm" style={{ color: 'var(--sim-forest)' }}>
                    {new Date(inv.created_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {inv.bonus_applied ? (
                    <span className="text-xs font-medium px-2 py-1 rounded-full" style={{ backgroundColor: 'rgba(45,106,79,0.1)', color: 'var(--sim-green)' }}>
                      +{inv.referrer_bonus_days} дн.
                    </span>
                  ) : (
                    <span className="text-xs px-2 py-1 rounded-full" style={{ backgroundColor: '#f0ebe3', color: 'var(--sim-text-hint)' }}>
                      Ожидает оплаты
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
