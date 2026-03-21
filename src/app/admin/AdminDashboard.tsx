'use client'

import { useState } from 'react'
import { adminUpdateSubscription } from '@/lib/actions/admin'

type Stats = {
  totalUsers: number
  totalPatients: number
  totalConsultations: number
  totalPayments: number
  recentPayments: Array<{ id: string; amount: number; status: string; created_at: string; doctor_id: string }>
  users: Array<{ id: string; email?: string; created_at: string; last_sign_in_at?: string; user_metadata?: { name?: string; full_name?: string } }>
  subscriptions: Array<{ doctor_id: string; plan_id: string; status: string; current_period_end: string; referral_bonus_days: number; subscription_plans: { name_ru: string } | null }>
  referrals: Array<{ id: string; referrer_id: string; invitee_id: string; referrer_bonus_days: number; invitee_bonus_days: number; bonus_applied: boolean }>
}

export default function AdminDashboard({ stats }: { stats: Stats }) {
  const [tab, setTab] = useState<'overview' | 'doctors' | 'payments' | 'referrals'>('overview')
  const [editSub, setEditSub] = useState<string | null>(null)
  const [newPlan, setNewPlan] = useState('standard')
  const [newEnd, setNewEnd] = useState('')
  const [saving, setSaving] = useState(false)

  const tabs = [
    { id: 'overview' as const, label: 'Обзор' },
    { id: 'doctors' as const, label: `Врачи (${stats.totalUsers})` },
    { id: 'payments' as const, label: 'Платежи' },
    { id: 'referrals' as const, label: 'Рефералы' },
  ]

  // Получить подписку врача
  function getSubscription(doctorId: string) {
    return stats.subscriptions.find(s => s.doctor_id === doctorId)
  }

  // Получить email по id
  function getUserEmail(userId: string) {
    return stats.users.find(u => u.id === userId)?.email || userId.slice(0, 8)
  }

  async function handleUpdateSub(doctorId: string) {
    setSaving(true)
    try {
      await adminUpdateSubscription(doctorId, newPlan, newEnd)
      setEditSub(null)
      window.location.reload()
    } catch {
      alert('Ошибка обновления')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen p-6" style={{ backgroundColor: 'var(--sim-bg)' }}>
      <div className="max-w-6xl mx-auto">
        {/* Заголовок */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold" style={{ fontFamily: 'var(--sim-font-serif)', color: 'var(--sim-text)' }}>
              Админ-панель
            </h1>
            <p className="text-sm mt-1" style={{ color: 'var(--sim-text-muted)' }}>Similia — управление сервисом</p>
          </div>
          <a href="/dashboard" className="btn btn-ghost btn-sm">← Вернуться</a>
        </div>

        {/* Статкарточки */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Врачей', value: stats.totalUsers, icon: '👨‍⚕️' },
            { label: 'Пациентов', value: stats.totalPatients, icon: '👥' },
            { label: 'Консультаций', value: stats.totalConsultations, icon: '🩺' },
            { label: 'Платежей', value: stats.totalPayments, icon: '💳' },
          ].map(s => (
            <div key={s.label} className="rounded-2xl p-5" style={{ backgroundColor: 'var(--sim-bg-card)', border: '1px solid var(--sim-border)' }}>
              <div className="text-2xl mb-1">{s.icon}</div>
              <div className="text-3xl font-bold" style={{ color: 'var(--sim-green)' }}>{s.value}</div>
              <div className="text-xs mt-1" style={{ color: 'var(--sim-text-muted)' }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Табы */}
        <div className="flex gap-1 mb-6 p-1 rounded-xl" style={{ backgroundColor: 'var(--sim-bg-muted)' }}>
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              style={{
                backgroundColor: tab === t.id ? 'var(--sim-bg-card)' : 'transparent',
                color: tab === t.id ? 'var(--sim-green)' : 'var(--sim-text-muted)',
                boxShadow: tab === t.id ? 'var(--sim-shadow-xs)' : 'none',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Контент */}
        <div className="rounded-2xl p-6" style={{ backgroundColor: 'var(--sim-bg-card)', border: '1px solid var(--sim-border)' }}>

          {/* Обзор */}
          {tab === 'overview' && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold" style={{ color: 'var(--sim-text)' }}>Последние регистрации</h2>
              <div className="space-y-2">
                {stats.users
                  .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                  .slice(0, 10)
                  .map(user => {
                    const sub = getSubscription(user.id)
                    return (
                      <div key={user.id} className="flex items-center justify-between py-3 px-4 rounded-xl" style={{ backgroundColor: 'var(--sim-bg-muted)' }}>
                        <div>
                          <div className="text-sm font-medium" style={{ color: 'var(--sim-text)' }}>
                            {user.user_metadata?.name || user.user_metadata?.full_name || 'Без имени'}
                          </div>
                          <div className="text-xs" style={{ color: 'var(--sim-text-muted)' }}>{user.email}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{
                            backgroundColor: sub?.plan_id === 'standard' ? 'var(--sim-green-light)' : 'var(--sim-bg-muted)',
                            color: sub?.plan_id === 'standard' ? 'var(--sim-green)' : 'var(--sim-text-muted)',
                          }}>
                            {sub?.subscription_plans?.name_ru || 'Free'}
                          </div>
                          <div className="text-xs mt-1" style={{ color: 'var(--sim-text-hint)' }}>
                            {new Date(user.created_at).toLocaleDateString('ru-RU')}
                          </div>
                        </div>
                      </div>
                    )
                  })}
              </div>
            </div>
          )}

          {/* Врачи */}
          {tab === 'doctors' && (
            <div className="space-y-3">
              <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--sim-text)' }}>Все врачи</h2>
              {stats.users
                .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                .map(user => {
                  const sub = getSubscription(user.id)
                  return (
                    <div key={user.id} className="p-4 rounded-xl" style={{ border: '1px solid var(--sim-border)' }}>
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="font-medium" style={{ color: 'var(--sim-text)' }}>
                            {user.user_metadata?.name || user.user_metadata?.full_name || 'Без имени'}
                          </div>
                          <div className="text-sm" style={{ color: 'var(--sim-text-muted)' }}>{user.email}</div>
                          <div className="text-xs mt-1" style={{ color: 'var(--sim-text-hint)' }}>
                            Регистрация: {new Date(user.created_at).toLocaleDateString('ru-RU')}
                            {user.last_sign_in_at && ` · Последний вход: ${new Date(user.last_sign_in_at).toLocaleDateString('ru-RU')}`}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{
                            backgroundColor: sub?.plan_id === 'standard' ? 'var(--sim-green-light)' : '#fef3c7',
                            color: sub?.plan_id === 'standard' ? 'var(--sim-green)' : '#92400e',
                          }}>
                            {sub?.subscription_plans?.name_ru || 'Free'}
                          </div>
                          {sub?.current_period_end && (
                            <div className="text-xs mt-1" style={{ color: 'var(--sim-text-hint)' }}>
                              до {new Date(sub.current_period_end).toLocaleDateString('ru-RU')}
                            </div>
                          )}
                          {sub?.referral_bonus_days ? (
                            <div className="text-xs mt-0.5" style={{ color: 'var(--sim-green)' }}>
                              +{sub.referral_bonus_days} реф. дней
                            </div>
                          ) : null}
                        </div>
                      </div>

                      {/* Управление подпиской */}
                      {editSub === user.id ? (
                        <div className="mt-3 pt-3 flex items-center gap-3" style={{ borderTop: '1px solid var(--sim-border)' }}>
                          <select value={newPlan} onChange={e => setNewPlan(e.target.value)} className="text-sm rounded-lg px-3 py-1.5" style={{ border: '1px solid var(--sim-border)' }}>
                            <option value="free">Free</option>
                            <option value="standard">Стандарт</option>
                          </select>
                          <input type="date" value={newEnd} onChange={e => setNewEnd(e.target.value)} className="text-sm rounded-lg px-3 py-1.5" style={{ border: '1px solid var(--sim-border)' }} />
                          <button onClick={() => handleUpdateSub(user.id)} disabled={saving} className="btn btn-primary btn-sm">
                            {saving ? '...' : 'Сохранить'}
                          </button>
                          <button onClick={() => setEditSub(null)} className="btn btn-ghost btn-sm">Отмена</button>
                        </div>
                      ) : (
                        <div className="mt-2">
                          <button
                            onClick={() => { setEditSub(user.id); setNewPlan(sub?.plan_id || 'free'); setNewEnd(sub?.current_period_end?.split('T')[0] || '') }}
                            className="text-xs font-medium transition-colors"
                            style={{ color: 'var(--sim-green)' }}
                          >
                            Изменить подписку
                          </button>
                        </div>
                      )}
                    </div>
                  )
                })}
            </div>
          )}

          {/* Платежи */}
          {tab === 'payments' && (
            <div>
              <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--sim-text)' }}>История платежей</h2>
              {stats.recentPayments.length === 0 ? (
                <p className="text-sm" style={{ color: 'var(--sim-text-hint)' }}>Платежей пока нет</p>
              ) : (
                <div className="space-y-2">
                  {stats.recentPayments.map(p => (
                    <div key={p.id} className="flex items-center justify-between py-3 px-4 rounded-xl" style={{ backgroundColor: 'var(--sim-bg-muted)' }}>
                      <div>
                        <div className="text-sm font-medium" style={{ color: 'var(--sim-text)' }}>{getUserEmail(p.doctor_id)}</div>
                        <div className="text-xs" style={{ color: 'var(--sim-text-hint)' }}>
                          {new Date(p.created_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-bold" style={{ color: 'var(--sim-green)' }}>{p.amount} ₽</div>
                        <div className="text-xs" style={{ color: p.status === 'succeeded' ? 'var(--sim-green)' : 'var(--sim-red)' }}>
                          {p.status === 'succeeded' ? '✓ Оплачен' : p.status}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Рефералы */}
          {tab === 'referrals' && (
            <div>
              <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--sim-text)' }}>Реферальные приглашения</h2>
              {stats.referrals.length === 0 ? (
                <p className="text-sm" style={{ color: 'var(--sim-text-hint)' }}>Приглашений пока нет</p>
              ) : (
                <div className="space-y-2">
                  {stats.referrals.map(r => (
                    <div key={r.id} className="flex items-center justify-between py-3 px-4 rounded-xl" style={{ backgroundColor: 'var(--sim-bg-muted)' }}>
                      <div>
                        <div className="text-sm" style={{ color: 'var(--sim-text)' }}>
                          {getUserEmail(r.referrer_id)} → {getUserEmail(r.invitee_id)}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs" style={{ color: 'var(--sim-green)' }}>+{r.referrer_bonus_days}д / +{r.invitee_bonus_days}д</span>
                        <span className="text-xs px-2 py-0.5 rounded-full" style={{
                          backgroundColor: r.bonus_applied ? 'var(--sim-green-light)' : '#fef3c7',
                          color: r.bonus_applied ? 'var(--sim-green)' : '#92400e',
                        }}>
                          {r.bonus_applied ? '✓ Начислено' : '⏳ Ожидает'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
