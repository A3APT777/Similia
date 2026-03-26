import Link from 'next/link'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'

export default async function CheckoutSuccessPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) redirect('/login')

  // Проверяем реальный статус подписки
  const sub = await prisma.subscription.findUnique({
    where: { doctorId: session.user.id },
    select: { planId: true, status: true, currentPeriodEnd: true, referralBonusDays: true },
  })

  const isActive = sub?.planId === 'standard' && sub?.status === 'active'
  const periodEnd = sub?.currentPeriodEnd
    ? new Date(sub.currentPeriodEnd).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })
    : ''

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: 'var(--sim-bg)' }}>
      <div className="text-center max-w-md">
        {isActive ? (
          <>
            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: 'var(--sim-green)' }}>
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-2xl font-normal mb-2" style={{ fontFamily: 'var(--font-cormorant)', color: 'var(--sim-forest)' }}>
              Оплата прошла успешно!
            </h1>
            <p className="text-gray-600 mb-2">
              Тариф «Стандарт» активирован. Все функции Similia доступны без ограничений.
            </p>
            <p className="text-sm mb-2" style={{ color: 'var(--sim-text-hint)' }}>
              Подписка действует до {periodEnd}
            </p>
            {(sub?.referralBonusDays ?? 0) > 0 && (
              <p className="text-sm font-medium mb-4" style={{ color: 'var(--sim-amber)' }}>
                🎁 Вам начислено {sub!.referralBonusDays} бонусных дней по реферальной программе
              </p>
            )}
            <div className="mb-6" />
          </>
        ) : (
          <>
            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: '#d97706' }}>
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h1 className="text-2xl font-normal mb-2" style={{ fontFamily: 'var(--font-cormorant)', color: 'var(--sim-forest)' }}>
              Обработка платежа...
            </h1>
            <p className="text-gray-600 mb-6">
              Платёж обрабатывается. Обычно это занимает несколько секунд. Если подписка не активировалась в течение 5 минут — напишите нам на simillia@mail.ru.
            </p>
          </>
        )}
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-white text-sm font-medium transition-colors"
          style={{ backgroundColor: 'var(--sim-green)' }}
        >
          Перейти в кабинет →
        </Link>
      </div>
    </div>
  )
}
