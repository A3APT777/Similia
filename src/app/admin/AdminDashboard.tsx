'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  adminUpdateSubscription,
  adminToggleAIPro,
  adminAddAICredits,
  adminDeleteUser,
  adminBlockUser,
} from '@/lib/actions/admin'

// Статистика платформы
type Stats = {
  totalUsers: number
  totalPatients: number
  totalConsultations: number
  totalPayments: number
  recentPayments: Array<{
    id: string
    amount: number
    status: string
    created_at: string
    doctor_id: string
  }>
  users: Array<{
    id: string
    email?: string
    created_at: string
    last_sign_in_at?: string
    user_metadata?: { name?: string; full_name?: string }
  }>
  subscriptions: Array<{
    doctor_id: string
    plan_id: string
    status: string
    current_period_end: string
    referral_bonus_days: number
    subscription_plans: { name_ru: string } | null
  }>
  referrals: Array<{
    id: string
    referrerId: string
    inviteeId: string
    referrerBonusDays: number
    inviteeBonusDays: number
    bonusApplied: boolean
  }>
}

// Данные врача
type Doctor = {
  id: string
  email?: string
  name: string
  createdAt: string
  lastSignIn?: string
  patientCount: number
  consultationCount: number
  subscription: {
    plan_id: string
    status: string
    current_period_end: string
    referral_bonus_days: number
    subscription_plans: { name_ru: string } | null
  } | null
  referralCode: string | null
  aiPro: boolean
  aiCredits: number
  emailVerified: string | null
}

// Тестовые email — скрываем по умолчанию
const TEST_EMAILS = [
  '123123123@mail.ru',
  'nnn@mail.ru',
  'ss@mail.ru',
  '333@mail.ru',
  '444@mail.ru',
  'qwerty@mail.ru',
  't12@mail.ru',
  '66666666@mail.ru',
]

// Метка тарифа — цвет и текст
function planBadge(planId?: string) {
  switch (planId) {
    case 'ai_pro':
      return { bg: 'rgba(99,102,241,0.1)', color: '#6366f1', label: 'AI Pro' }
    case 'standard':
      return { bg: 'var(--sim-green-light)', color: 'var(--sim-green)', label: 'Стандарт' }
    default:
      return { bg: '#fef3c7', color: '#92400e', label: 'Free' }
  }
}

export default function AdminDashboard({ stats, doctors }: { stats: Stats; doctors: Doctor[] }) {
  const router = useRouter()

  // Состояние фильтров
  const [search, setSearch] = useState('')
  const [hideTest, setHideTest] = useState(true)

  // Состояние редактирования подписки
  const [editSubId, setEditSubId] = useState<string | null>(null)
  const [newPlan, setNewPlan] = useState('standard')
  const [newEnd, setNewEnd] = useState('')

  // Состояние начисления кредитов
  const [creditDocId, setCreditDocId] = useState<string | null>(null)
  const [creditAmount, setCreditAmount] = useState('')

  // Флаг загрузки
  const [saving, setSaving] = useState(false)

  // Фильтрация врачей
  const filteredDoctors = (hideTest
    ? doctors.filter(d => !TEST_EMAILS.includes(d.email || ''))
    : doctors
  ).filter(
    d =>
      !search ||
      (d.name + ' ' + d.email).toLowerCase().includes(search.toLowerCase())
  )

  // Получить email по id (для таблицы платежей)
  function getUserEmail(userId: string) {
    return stats.users.find(u => u.id === userId)?.email || userId.slice(0, 8)
  }

  // Map: invitee_id → краткая инфа о реферере (кто пригласил этого врача).
  // Нужно чтобы в таблице врачей рядом с именем показывать «← пришёл от X».
  const referrerByInvitee = new Map<string, { id: string; name: string; email: string } | null>()
  for (const r of stats.referrals) {
    const referrer = doctors.find(d => d.id === r.referrerId)
    if (referrer) {
      referrerByInvitee.set(r.inviteeId, { id: referrer.id, name: referrer.name, email: referrer.email || '' })
    } else {
      // реферер по какой-то причине отсутствует в списке врачей (удалён?) — покажем всё равно
      referrerByInvitee.set(r.inviteeId, null)
    }
  }

  // --- Действия ---

  // Смена тарифа
  async function handleUpdateSub(doctorId: string) {
    setSaving(true)
    try {
      await adminUpdateSubscription(doctorId, newPlan, newEnd)
      setEditSubId(null)
      router.refresh()
    } catch {
      alert('Ошибка обновления подписки')
    } finally {
      setSaving(false)
    }
  }

  // Начислить AI-кредиты
  async function handleAddCredits(doctorId: string) {
    const amount = Number(creditAmount)
    if (!amount || isNaN(amount) || amount <= 0) {
      alert('Введите положительное число')
      return
    }
    setSaving(true)
    try {
      await adminAddAICredits(doctorId, amount)
      setCreditDocId(null)
      setCreditAmount('')
      router.refresh()
    } catch {
      alert('Ошибка начисления кредитов')
    } finally {
      setSaving(false)
    }
  }

  // Заблокировать / разблокировать
  async function handleToggleBlock(doc: Doctor) {
    const isBlocked = doc.emailVerified === null
    const action = isBlocked ? 'разблокировать' : 'заблокировать'
    if (!confirm(`Вы уверены, что хотите ${action} ${doc.name || doc.email}?`)) return
    setSaving(true)
    try {
      await adminBlockUser(doc.id, !isBlocked)
      router.refresh()
    } catch {
      alert('Ошибка обновления статуса')
    } finally {
      setSaving(false)
    }
  }

  // Удалить аккаунт
  async function handleDelete(doc: Doctor) {
    if (
      !confirm(
        `Удалить аккаунт ${doc.name || doc.email}?\n\nВсе данные (пациенты, консультации) будут удалены безвозвратно!`
      )
    )
      return
    setSaving(true)
    try {
      await adminDeleteUser(doc.id)
      router.refresh()
    } catch {
      alert('Ошибка удаления')
    } finally {
      setSaving(false)
    }
  }

  // Переключить AI Pro
  async function handleToggleAIPro(doc: Doctor) {
    setSaving(true)
    try {
      await adminToggleAIPro(doc.id, !doc.aiPro)
      router.refresh()
    } catch {
      alert('Ошибка обновления AI Pro')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen p-6" style={{ backgroundColor: 'var(--sim-bg)' }}>
      <div className="max-w-7xl mx-auto">
        {/* Заголовок */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1
              className="text-3xl font-bold heading-serif"
              style={{ color: 'var(--sim-text)' }}
            >
              Админ-панель
            </h1>
            <p className="text-sm mt-1" style={{ color: 'var(--sim-text-muted)' }}>
              Similia — управление сервисом
            </p>
          </div>
          <div className="flex items-center gap-3">
            <a
              href="/admin/ai-logs"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors"
              style={{
                backgroundColor: 'rgba(99,102,241,0.1)',
                color: '#6366f1',
                border: '1px solid rgba(99,102,241,0.2)',
              }}
            >
              AI Logs
            </a>
            <a
              href="/dashboard"
              className="px-4 py-2 rounded-xl text-sm font-medium transition-colors"
              style={{ color: 'var(--sim-text-muted)' }}
            >
              &larr; Вернуться
            </a>
          </div>
        </div>

        {/* ===== Статистика (4 карточки) ===== */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Всего врачей', value: stats.totalUsers },
            { label: 'Пациентов (не демо)', value: stats.totalPatients },
            { label: 'Консультаций', value: stats.totalConsultations },
            { label: 'Оплаченных подписок', value: stats.totalPayments },
          ].map(s => (
            <div
              key={s.label}
              className="rounded-xl p-5"
              style={{
                backgroundColor: 'var(--sim-bg-card)',
                border: '1px solid var(--sim-border)',
              }}
            >
              <div
                className="text-3xl font-bold"
                style={{ color: 'var(--sim-green)' }}
              >
                {s.value}
              </div>
              <div
                className="text-xs mt-1"
                style={{ color: 'var(--sim-text-muted)' }}
              >
                {s.label}
              </div>
            </div>
          ))}
        </div>

        {/* ===== Таблица врачей ===== */}
        <div
          className="rounded-xl p-6 mb-8"
          style={{
            backgroundColor: 'var(--sim-bg-card)',
            border: '1px solid var(--sim-border)',
          }}
        >
          {/* Заголовок + фильтры */}
          <div className="flex items-center justify-between mb-5 gap-3 flex-wrap">
            <h2
              className="text-lg font-semibold heading-serif"
              style={{ color: 'var(--sim-text)' }}
            >
              Врачи ({filteredDoctors.length})
            </h2>
            <div className="flex items-center gap-3">
              <input
                type="text"
                placeholder="Поиск по имени / email..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="text-sm rounded-xl px-3 py-2 w-56"
                style={{
                  border: '1px solid var(--sim-border)',
                  backgroundColor: 'var(--sim-bg-input)',
                  color: 'var(--sim-text)',
                }}
              />
              <label
                className="flex items-center gap-2 text-xs cursor-pointer whitespace-nowrap"
                style={{ color: 'var(--sim-text-muted)' }}
              >
                <input
                  type="checkbox"
                  checked={hideTest}
                  onChange={e => setHideTest(e.target.checked)}
                />
                Скрыть тестовых
              </label>
            </div>
          </div>

          {/* Таблица */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm" style={{ color: 'var(--sim-text)' }}>
              <thead>
                <tr
                  className="text-left text-xs"
                  style={{
                    color: 'var(--sim-text-muted)',
                    borderBottom: '1px solid var(--sim-border)',
                  }}
                >
                  <th className="pb-3 pr-3">Имя / Email</th>
                  <th className="pb-3 pr-3 hidden lg:table-cell">Регистрация</th>
                  <th className="pb-3 pr-3 text-center">Пациенты</th>
                  <th className="pb-3 pr-3 text-center hidden lg:table-cell">Консультации</th>
                  <th className="pb-3 pr-3">Тариф</th>
                  <th className="pb-3 pr-3 text-center hidden lg:table-cell">AI-кредиты</th>
                  <th className="pb-3 pr-3 hidden lg:table-cell">Реф. код</th>
                  <th className="pb-3">Действия</th>
                </tr>
              </thead>
              <tbody>
                {filteredDoctors
                  .sort(
                    (a, b) =>
                      new Date(b.createdAt).getTime() -
                      new Date(a.createdAt).getTime()
                  )
                  .map(doc => {
                    const badge = planBadge(
                      doc.subscription?.plan_id
                    )
                    const isBlocked = doc.emailVerified === null

                    return (
                      <tr
                        key={doc.id}
                        className="align-top"
                        style={{
                          borderBottom: '1px solid var(--sim-border)',
                        }}
                      >
                        {/* Имя + Email */}
                        <td className="py-3 pr-3">
                          <div className="font-medium flex items-center gap-2 flex-wrap">
                            {doc.name || 'Без имени'}
                            {isBlocked && (
                              <span
                                className="text-xs px-1.5 py-0.5 rounded-full font-semibold"
                                style={{
                                  backgroundColor: '#fef2f2',
                                  color: '#dc2626',
                                }}
                              >
                                Заблок.
                              </span>
                            )}
                            {referrerByInvitee.has(doc.id) && (
                              <span
                                className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                                style={{ backgroundColor: 'rgba(45,106,79,0.1)', color: '#2d6a4f' }}
                                title={
                                  referrerByInvitee.get(doc.id)
                                    ? `Пришёл по реферальной ссылке от ${referrerByInvitee.get(doc.id)!.name || referrerByInvitee.get(doc.id)!.email}`
                                    : 'Пришёл по реферальной ссылке (реферер удалён)'
                                }
                              >
                                🔗 от {referrerByInvitee.get(doc.id)?.name || referrerByInvitee.get(doc.id)?.email?.split('@')[0] || '—'}
                              </span>
                            )}
                          </div>
                          <div
                            className="text-xs"
                            style={{ color: 'var(--sim-text-muted)' }}
                          >
                            {doc.email}
                          </div>
                        </td>

                        {/* Дата регистрации */}
                        <td
                          className="py-3 pr-3 text-xs hidden lg:table-cell"
                          style={{ color: 'var(--sim-text-muted)' }}
                        >
                          {new Date(doc.createdAt).toLocaleDateString('ru-RU')}
                        </td>

                        {/* Пациенты */}
                        <td className="py-3 pr-3 text-center">
                          {doc.patientCount}
                        </td>

                        {/* Консультации */}
                        <td className="py-3 pr-3 text-center hidden lg:table-cell">
                          {doc.consultationCount}
                        </td>

                        {/* Тариф + дата окончания */}
                        <td className="py-3 pr-3">
                          <span
                            className="text-xs font-semibold px-2 py-0.5 rounded-full inline-block"
                            style={{
                              backgroundColor: badge.bg,
                              color: badge.color,
                            }}
                          >
                            {badge.label}
                          </span>
                          {doc.subscription?.current_period_end && (
                            <div
                              className="text-xs mt-1"
                              style={{ color: 'var(--sim-text-hint)' }}
                            >
                              до{' '}
                              {new Date(
                                doc.subscription.current_period_end
                              ).toLocaleDateString('ru-RU')}
                            </div>
                          )}
                          {doc.aiPro && doc.subscription?.plan_id !== 'ai_pro' && (
                            <span
                              className="text-xs font-semibold px-2 py-0.5 rounded-full inline-block mt-1"
                              style={{
                                backgroundColor: 'rgba(99,102,241,0.1)',
                                color: '#6366f1',
                              }}
                            >
                              AI Pro
                            </span>
                          )}
                        </td>

                        {/* AI-кредиты */}
                        <td
                          className="py-3 pr-3 text-center hidden lg:table-cell"
                          style={{
                            color:
                              doc.aiCredits > 0
                                ? '#6366f1'
                                : 'var(--sim-text-muted)',
                          }}
                        >
                          {doc.aiCredits}
                        </td>

                        {/* Реферальный код */}
                        <td
                          className="py-3 pr-3 text-xs hidden lg:table-cell"
                          style={{ color: 'var(--sim-text-muted)' }}
                        >
                          {doc.referralCode || '—'}
                        </td>

                        {/* Действия */}
                        <td className="py-3">
                          {/* Редактирование подписки (инлайн) */}
                          {editSubId === doc.id ? (
                            <div className="flex items-center gap-2 flex-wrap">
                              <select
                                value={newPlan}
                                onChange={e => setNewPlan(e.target.value)}
                                className="text-xs rounded-lg px-2 py-1"
                                style={{
                                  border: '1px solid var(--sim-border)',
                                  backgroundColor: 'var(--sim-bg-input)',
                                  color: 'var(--sim-text)',
                                }}
                              >
                                <option value="free">Free</option>
                                <option value="standard">Стандарт</option>
                                <option value="ai_pro">AI Pro</option>
                              </select>
                              <input
                                type="date"
                                value={newEnd}
                                onChange={e => setNewEnd(e.target.value)}
                                className="text-xs rounded-lg px-2 py-1"
                                style={{
                                  border: '1px solid var(--sim-border)',
                                  backgroundColor: 'var(--sim-bg-input)',
                                  color: 'var(--sim-text)',
                                }}
                              />
                              <button
                                onClick={() => handleUpdateSub(doc.id)}
                                disabled={saving}
                                className="text-xs font-medium px-3 py-1 rounded-full transition-colors"
                                style={{
                                  backgroundColor: 'var(--sim-green)',
                                  color: '#fff',
                                }}
                              >
                                {saving ? '...' : 'OK'}
                              </button>
                              <button
                                onClick={() => setEditSubId(null)}
                                className="text-xs font-medium px-2 py-1 rounded-full"
                                style={{ color: 'var(--sim-text-muted)' }}
                              >
                                Отмена
                              </button>
                            </div>
                          ) : creditDocId === doc.id ? (
                            /* Начисление кредитов (инлайн) */
                            <div className="flex items-center gap-2 flex-wrap">
                              <input
                                type="number"
                                min="1"
                                placeholder="Кол-во"
                                value={creditAmount}
                                onChange={e => setCreditAmount(e.target.value)}
                                className="text-xs rounded-lg px-2 py-1 w-20"
                                style={{
                                  border: '1px solid var(--sim-border)',
                                  backgroundColor: 'var(--sim-bg-input)',
                                  color: 'var(--sim-text)',
                                }}
                              />
                              <button
                                onClick={() => handleAddCredits(doc.id)}
                                disabled={saving}
                                className="text-xs font-medium px-3 py-1 rounded-full transition-colors"
                                style={{
                                  backgroundColor: '#6366f1',
                                  color: '#fff',
                                }}
                              >
                                {saving ? '...' : 'Начислить'}
                              </button>
                              <button
                                onClick={() => {
                                  setCreditDocId(null)
                                  setCreditAmount('')
                                }}
                                className="text-xs font-medium px-2 py-1 rounded-full"
                                style={{ color: 'var(--sim-text-muted)' }}
                              >
                                Отмена
                              </button>
                            </div>
                          ) : (
                            /* Кнопки действий */
                            <div className="flex items-center gap-2 flex-wrap">
                              {/* Сменить тариф */}
                              <button
                                onClick={() => {
                                  setEditSubId(doc.id)
                                  setNewPlan(
                                    doc.subscription?.plan_id || 'free'
                                  )
                                  setNewEnd(
                                    doc.subscription?.current_period_end?.split(
                                      'T'
                                    )[0] || ''
                                  )
                                }}
                                className="text-xs font-medium px-3 py-1 rounded-full transition-colors"
                                style={{
                                  backgroundColor: 'var(--sim-green-light)',
                                  color: 'var(--sim-green)',
                                }}
                              >
                                Тариф
                              </button>

                              {/* Начислить кредиты */}
                              <button
                                onClick={() => setCreditDocId(doc.id)}
                                className="text-xs font-medium px-3 py-1 rounded-full transition-colors"
                                style={{
                                  backgroundColor: 'rgba(99,102,241,0.1)',
                                  color: '#6366f1',
                                }}
                              >
                                + Кредиты
                              </button>

                              {/* AI Pro вкл/выкл */}
                              <button
                                onClick={() => handleToggleAIPro(doc)}
                                disabled={saving}
                                className="text-xs font-medium px-3 py-1 rounded-full transition-colors"
                                style={{
                                  backgroundColor: doc.aiPro
                                    ? '#fef2f2'
                                    : 'rgba(99,102,241,0.1)',
                                  color: doc.aiPro ? '#dc2626' : '#6366f1',
                                }}
                              >
                                {doc.aiPro ? 'Выкл AI Pro' : 'Вкл AI Pro'}
                              </button>

                              {/* Заблокировать / разблокировать */}
                              <button
                                onClick={() => handleToggleBlock(doc)}
                                disabled={saving}
                                className="text-xs font-medium px-3 py-1 rounded-full transition-colors"
                                style={{
                                  backgroundColor: isBlocked
                                    ? 'var(--sim-green-light)'
                                    : '#fef3c7',
                                  color: isBlocked
                                    ? 'var(--sim-green)'
                                    : '#92400e',
                                }}
                              >
                                {isBlocked ? 'Разблокировать' : 'Заблокировать'}
                              </button>

                              {/* Удалить */}
                              <button
                                onClick={() => handleDelete(doc)}
                                disabled={saving}
                                className="text-xs font-medium px-3 py-1 rounded-full transition-colors"
                                style={{
                                  backgroundColor: '#fef2f2',
                                  color: '#dc2626',
                                }}
                              >
                                Удалить
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    )
                  })}
              </tbody>
            </table>
          </div>

          {filteredDoctors.length === 0 && (
            <p
              className="text-center py-8 text-sm"
              style={{ color: 'var(--sim-text-hint)' }}
            >
              Врачи не найдены
            </p>
          )}
        </div>

        {/* ===== Последние платежи ===== */}
        <div
          className="rounded-xl p-6"
          style={{
            backgroundColor: 'var(--sim-bg-card)',
            border: '1px solid var(--sim-border)',
          }}
        >
          <h2
            className="text-lg font-semibold heading-serif mb-5"
            style={{ color: 'var(--sim-text)' }}
          >
            Последние платежи
          </h2>

          {stats.recentPayments.length === 0 ? (
            <p className="text-sm" style={{ color: 'var(--sim-text-hint)' }}>
              Платежей пока нет
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table
                className="w-full text-sm"
                style={{ color: 'var(--sim-text)' }}
              >
                <thead>
                  <tr
                    className="text-left text-xs"
                    style={{
                      color: 'var(--sim-text-muted)',
                      borderBottom: '1px solid var(--sim-border)',
                    }}
                  >
                    <th className="pb-3 pr-3">Врач</th>
                    <th className="pb-3 pr-3">Дата</th>
                    <th className="pb-3 pr-3 text-right">Сумма</th>
                    <th className="pb-3 text-right">Статус</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.recentPayments.map(p => (
                    <tr
                      key={p.id}
                      style={{
                        borderBottom: '1px solid var(--sim-border)',
                      }}
                    >
                      <td className="py-3 pr-3">
                        {getUserEmail(p.doctor_id)}
                      </td>
                      <td
                        className="py-3 pr-3 text-xs"
                        style={{ color: 'var(--sim-text-muted)' }}
                      >
                        {new Date(p.created_at).toLocaleDateString('ru-RU', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td
                        className="py-3 pr-3 text-right font-bold"
                        style={{ color: 'var(--sim-green)' }}
                      >
                        {p.amount} ₽
                      </td>
                      <td className="py-3 text-right">
                        <span
                          className="text-xs font-semibold px-2 py-0.5 rounded-full"
                          style={{
                            backgroundColor:
                              p.status === 'succeeded'
                                ? 'var(--sim-green-light)'
                                : '#fef2f2',
                            color:
                              p.status === 'succeeded'
                                ? 'var(--sim-green)'
                                : '#dc2626',
                          }}
                        >
                          {p.status === 'succeeded' ? 'Оплачен' : p.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
