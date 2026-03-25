'use client'

import { useState } from 'react'
import { adminUpdateSubscription, adminToggleAIPro, adminAddAICredits } from '@/lib/actions/admin'

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

type Doctor = {
  id: string
  email?: string
  name: string
  createdAt: string
  lastSignIn?: string
  patientCount: number
  consultationCount: number
  subscription: { plan_id: string; status: string; current_period_end: string; referral_bonus_days: number; subscription_plans: { name_ru: string } | null } | null
  referralCode: string | null
  aiPro: boolean
  aiCredits: number
}

// Тестовые email — скрываем по умолчанию
const TEST_EMAILS = ['123123123@mail.ru', 'nnn@mail.ru', 'ss@mail.ru', '333@mail.ru', '444@mail.ru', 'qwerty@mail.ru', 't12@mail.ru', '66666666@mail.ru']

export default function AdminDashboard({ stats, doctors }: { stats: Stats; doctors: Doctor[] }) {
  const [tab, setTab] = useState<'overview' | 'doctors' | 'payments' | 'referrals'>('overview')
  const [editSub, setEditSub] = useState<string | null>(null)
  const [newPlan, setNewPlan] = useState('standard')
  const [newEnd, setNewEnd] = useState('')
  const [saving, setSaving] = useState(false)
  const [hideTest, setHideTest] = useState(true)
  const [search, setSearch] = useState('')

  const filteredDoctors = (hideTest
    ? doctors.filter(d => !TEST_EMAILS.includes(d.email || ''))
    : doctors
  ).filter(d => !search || (d.name + ' ' + d.email).toLowerCase().includes(search.toLowerCase()))

  const filteredUsers = hideTest
    ? stats.users.filter(u => !TEST_EMAILS.includes(u.email || ''))
    : stats.users

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

        {/* Быстрые ссылки */}
        <div className="mb-6">
          <a
            href="/admin/ai-logs"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors"
            style={{ backgroundColor: 'rgba(99,102,241,0.1)', color: '#6366f1', border: '1px solid rgba(99,102,241,0.2)' }}
          >
            <span>🤖</span>
            AI Analysis Logs
            <span style={{ fontSize: '11px', opacity: 0.6 }}>→</span>
          </a>
        </div>

        {/* Статкарточки */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Врачей', value: stats.totalUsers, icon: '👨‍⚕️' },
            { label: 'Пациентов', value: stats.totalPatients, icon: '👥' },
            { label: 'Консультаций', value: stats.totalConsultations, icon: '🩺' },
            { label: 'Платежей', value: stats.totalPayments, icon: '💳' },
          ].map(s => (
            <div key={s.label} className="rounded-xl p-5" style={{ backgroundColor: 'var(--sim-bg-card)', border: '1px solid var(--sim-border)' }}>
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
              className="px-4 py-2 rounded-full text-sm font-medium transition-colors"
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
        <div className="rounded-xl p-6" style={{ backgroundColor: 'var(--sim-bg-card)', border: '1px solid var(--sim-border)' }}>

          {/* Обзор */}
          {tab === 'overview' && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold" style={{ color: 'var(--sim-text)' }}>Последние регистрации</h2>
              <div className="space-y-2">
                {filteredUsers
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
              <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
                <h2 className="text-lg font-semibold" style={{ color: 'var(--sim-text)' }}>Врачи ({filteredDoctors.length})</h2>
                <div className="flex items-center gap-3">
                  <input
                    type="text"
                    placeholder="Поиск..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="text-sm rounded-lg px-3 py-1.5 w-40"
                    style={{ border: '1px solid var(--sim-border)', backgroundColor: 'var(--sim-bg-input)' }}
                  />
                  <label className="flex items-center gap-2 text-xs cursor-pointer whitespace-nowrap" style={{ color: 'var(--sim-text-muted)' }}>
                    <input type="checkbox" checked={hideTest} onChange={e => setHideTest(e.target.checked)} />
                    Скрыть тестовых
                  </label>
                </div>
              </div>
              {filteredDoctors
                .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                .map(doc => (
                    <div key={doc.id} className="p-4 rounded-xl" style={{ border: '1px solid var(--sim-border)' }}>
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="font-medium" style={{ color: 'var(--sim-text)' }}>
                            {doc.name || 'Без имени'}
                          </div>
                          <div className="text-sm" style={{ color: 'var(--sim-text-muted)' }}>{doc.email}</div>
                          <div className="text-xs mt-1" style={{ color: 'var(--sim-text-hint)' }}>
                            Регистрация: {new Date(doc.createdAt).toLocaleDateString('ru-RU')}
                            {doc.lastSignIn && ` · Последний вход: ${new Date(doc.lastSignIn).toLocaleDateString('ru-RU')}`}
                          </div>
                          <div className="text-xs mt-1" style={{ color: 'var(--sim-text-muted)' }}>
                            {doc.patientCount} пациентов · {doc.consultationCount} консультаций
                            {doc.referralCode && ` · Реф: ${doc.referralCode}`}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="flex items-center gap-1.5 justify-end">
                            <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{
                              backgroundColor: doc.subscription?.plan_id === 'standard' ? 'var(--sim-green-light)' : '#fef3c7',
                              color: doc.subscription?.plan_id === 'standard' ? 'var(--sim-green)' : '#92400e',
                            }}>
                              {doc.subscription?.subscription_plans?.name_ru || 'Free'}
                            </span>
                            {doc.aiPro && (
                              <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: 'rgba(99,102,241,0.1)', color: '#6366f1' }}>
                                AI Pro
                              </span>
                            )}
                          </div>
                          {doc.subscription?.current_period_end && (
                            <div className="text-xs mt-1" style={{ color: 'var(--sim-text-hint)' }}>
                              до {new Date(doc.subscription.current_period_end).toLocaleDateString('ru-RU')}
                            </div>
                          )}
                          {doc.subscription?.referral_bonus_days ? (
                            <div className="text-xs mt-0.5" style={{ color: 'var(--sim-green)' }}>
                              +{doc.subscription.referral_bonus_days} реф. дней
                            </div>
                          ) : null}
                          {doc.aiCredits > 0 && (
                            <div className="text-xs mt-0.5" style={{ color: '#6366f1' }}>
                              {doc.aiCredits} AI-кредитов
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Управление */}
                      {editSub === doc.id ? (
                        <div className="mt-3 pt-3 flex items-center gap-3 flex-wrap" style={{ borderTop: '1px solid var(--sim-border)' }}>
                          <select value={newPlan} onChange={e => setNewPlan(e.target.value)} className="text-sm rounded-lg px-3 py-1.5" style={{ border: '1px solid var(--sim-border)' }}>
                            <option value="free">Free</option>
                            <option value="standard">Стандарт</option>
                          </select>
                          <input type="date" value={newEnd} onChange={e => setNewEnd(e.target.value)} className="text-sm rounded-lg px-3 py-1.5" style={{ border: '1px solid var(--sim-border)' }} />
                          <button onClick={() => handleUpdateSub(doc.id)} disabled={saving} className="btn btn-primary btn-sm">
                            {saving ? '...' : 'Сохранить'}
                          </button>
                          <button onClick={() => setEditSub(null)} className="btn btn-ghost btn-sm">Отмена</button>
                        </div>
                      ) : (
                        <div className="mt-2 flex items-center gap-4 flex-wrap">
                          <button
                            onClick={() => { setEditSub(doc.id); setNewPlan(doc.subscription?.plan_id || 'free'); setNewEnd(doc.subscription?.current_period_end?.split('T')[0] || '') }}
                            className="text-xs font-medium transition-colors"
                            style={{ color: 'var(--sim-green)' }}
                          >
                            Изменить подписку
                          </button>
                          <button
                            onClick={async () => {
                              await adminToggleAIPro(doc.id, !doc.aiPro)
                              window.location.reload()
                            }}
                            className="text-xs font-medium transition-colors"
                            style={{ color: doc.aiPro ? '#dc2626' : '#6366f1' }}
                          >
                            {doc.aiPro ? '✕ Выкл AI Pro' : '⚡ Вкл AI Pro'}
                          </button>
                          <button
                            onClick={async () => {
                              const amount = prompt('Сколько кредитов добавить?', '5')
                              if (amount && !isNaN(Number(amount))) {
                                await adminAddAICredits(doc.id, Number(amount))
                                window.location.reload()
                              }
                            }}
                            className="text-xs font-medium transition-colors"
                            style={{ color: '#6366f1' }}
                          >
                            + Кредиты ({doc.aiCredits})
                          </button>
                        </div>
                      )}
                    </div>
                ))}
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
