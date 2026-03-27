'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useLanguage } from '@/hooks/useLanguage'

type Props = {
  onOpenMenu: () => void
}

export default function BottomNav({ onOpenMenu }: Props) {
  const pathname = usePathname()
  const { lang } = useLanguage()

  // Не показывать на страницах консультации и реперториума (у них свои fixed элементы)
  const isConsultation = pathname.includes('/consultations/')
  const isRepertory = pathname === '/repertory'
  if (isConsultation || isRepertory) return null

  const items = [
    {
      href: '/dashboard',
      label: lang === 'ru' ? 'Главная' : 'Home',
      active: pathname === '/dashboard',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
        </svg>
      ),
    },
    {
      href: '/repertory',
      label: lang === 'ru' ? 'Реперторий' : 'Repertory',
      active: pathname === '/repertory',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
        </svg>
      ),
    },
    {
      href: '/ai-consultation',
      label: 'AI',
      active: pathname.startsWith('/ai-consultation'),
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
        </svg>
      ),
    },
  ]

  return (
    <nav
      className="lg:hidden fixed bottom-0 left-0 right-0 z-30 flex items-stretch"
      style={{
        backgroundColor: 'rgba(247,243,237,0.95)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderTop: '1px solid rgba(0,0,0,0.06)',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
    >
      {items.map(item => (
        <Link
          key={item.href}
          href={item.href}
          className="flex-1 flex flex-col items-center justify-center gap-0.5 py-2 transition-colors"
          style={{ color: item.active ? 'var(--sim-green, #2d6a4f)' : 'var(--sim-text-muted, #9a8a6a)' }}
        >
          <span style={{ opacity: item.active ? 1 : 0.5 }}>{item.icon}</span>
          <span className="text-[10px] font-medium">{item.label}</span>
        </Link>
      ))}
      {/* Ещё — открывает sidebar */}
      <button
        onClick={onOpenMenu}
        className="flex-1 flex flex-col items-center justify-center gap-0.5 py-2 transition-colors"
        style={{ color: 'var(--sim-text-muted, #9a8a6a)' }}
      >
        <span style={{ opacity: 0.5 }}>
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
          </svg>
        </span>
        <span className="text-[10px] font-medium">{lang === 'ru' ? 'Ещё' : 'More'}</span>
      </button>
    </nav>
  )
}
