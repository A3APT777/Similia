'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import LogoutButton from './LogoutButton'
import { useLanguage } from '@/hooks/useLanguage'
import { t } from '@/lib/i18n'
import TourModal, { useTourAutoShow } from './TourModal'

type Props = {
  firstName: string
  initials: string
  children: React.ReactNode
}

export default function SidebarShell({ firstName, initials, children }: Props) {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()
  const { lang, toggle } = useLanguage()
  const { show: showTour, setShow: setShowTour } = useTourAutoShow()

  // Закрываем drawer при смене страницы
  useEffect(() => { setOpen(false) }, [pathname])

  // Блокируем скролл body когда drawer открыт
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  const navLink = (href: string, label: string, icon: React.ReactNode, tourId?: string) => {
    const isActive = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
    return (
      <Link
        href={href}
        onClick={() => setOpen(false)}
        data-tour={tourId}
        className={`flex items-center gap-3 px-3 py-3 lg:py-2 rounded-lg text-[15px] transition-all group ${
          isActive
            ? 'bg-white/[0.10] text-white'
            : 'text-white/50 hover:text-white/90 hover:bg-white/[0.07]'
        }`}
      >
        <span className={`shrink-0 transition-colors ${isActive ? 'text-white/80' : 'text-white/30 group-hover:text-white/60'}`}>
          {icon}
        </span>
        {label}
      </Link>
    )
  }

  const sidebarInner = (
    <>
      {/* Логотип */}
      <div className="px-4 h-[52px] flex items-center justify-between border-b border-white/[0.07] shrink-0">
        <Link href="/dashboard" onClick={() => setOpen(false)} className="flex items-center gap-2.5 group">
          <svg width="26" height="26" viewBox="0 0 36 36" fill="none">
            <ellipse cx="13" cy="18" rx="7" ry="11"
              transform="rotate(-15 13 18)"
              fill="#7dd4a8" opacity="0.9"/>
            <ellipse cx="23" cy="18" rx="7" ry="11"
              transform="rotate(15 23 18)"
              fill="#f7f3ed" opacity="0.45"/>
            <path d="M18 8 Q18 18 18 28"
              stroke="#1a3020" strokeWidth="0.8"
              strokeLinecap="round"/>
          </svg>
          <span style={{
            fontFamily: "'Cormorant Garamond', Georgia, serif",
            fontSize: '20px',
            fontWeight: '400',
            color: '#f7f3ed',
            letterSpacing: '0.02em'
          }}>Similia</span>
        </Link>
        {/* Кнопка закрытия — только мобильный */}
        <button
          onClick={() => setOpen(false)}
          className="lg:hidden p-1.5 text-white/30 hover:text-white/60 rounded-lg transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Навигация */}
      <nav data-tour="sidebar" className="flex-1 px-2 pt-4 pb-2 space-y-0.5 overflow-y-auto">
        <p className="px-3 pb-2 text-[11px] font-semibold text-white/20 uppercase tracking-[0.1em]">
          {t(lang).nav.workbench}
        </p>
        {navLink('/dashboard', t(lang).nav.home,
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
          </svg>
        )}

        <div className="pt-3">
          <p className="px-3 pb-2 text-[11px] font-semibold text-white/20 uppercase tracking-[0.1em]">
            {t(lang).nav.patients}
          </p>
          {navLink('/patients/new', t(lang).nav.newPatient,
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM4 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 0110.374 21c-2.331 0-4.512-.645-6.374-1.766z" />
            </svg>,
            'new-patient'
          )}
        </div>
      </nav>

      {/* Настройки */}
      <div className="px-2 pb-1 border-t border-white/[0.07] pt-1">
        {navLink('/settings', t(lang).nav.settings,
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        )}
      </div>

      {/* Цитата */}
      <div className="px-4 py-3 mx-2 mb-1 rounded-xl bg-white/[0.06] border border-white/[0.08]">
        <p className="text-[17px] italic leading-relaxed" style={{ color: 'rgba(255,255,255,0.88)', fontFamily: 'var(--font-cormorant, Georgia, serif)' }}>
          «Similia similibus curantur»
        </p>
        <p className="text-[12px] mt-1" style={{ color: 'rgba(255,255,255,0.55)' }}>Ганеман, 1796</p>
      </div>

      {/* Повторить обучение + правовые ссылки */}
      <div className="px-4 pb-2 space-y-1">
        <button
          onClick={() => setShowTour(true)}
          className="w-full text-left text-[12px] transition-colors hover:opacity-80"
          style={{ color: '#9a8a6a' }}
        >
          {t(lang).nav.retakeTour}
        </button>
        <div className="flex items-center gap-3">
          <Link href="/terms" className="text-[11px] hover:opacity-80 transition-opacity" style={{ color: 'rgba(255,255,255,0.25)' }}>
            {t(lang).nav.offer}
          </Link>
          <Link href="/privacy" className="text-[11px] hover:opacity-80 transition-opacity" style={{ color: 'rgba(255,255,255,0.25)' }}>
            {t(lang).nav.privacy}
          </Link>
        </div>
      </div>

      {/* Пользователь + переключатель языка */}
      <div className="px-2 py-3 border-t border-white/[0.07] shrink-0">
        {/* Кнопка переключения языка */}
        <div className="flex items-center justify-center mb-2">
          <button
            onClick={toggle}
            className="flex items-center text-[11px] font-semibold rounded-lg px-3 py-1.5 transition-colors"
            style={{ backgroundColor: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.5)' }}
            title={lang === 'ru' ? 'Switch to English' : 'Переключить на русский'}
          >
            <span style={{ color: lang === 'ru' ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.35)', fontWeight: lang === 'ru' ? 700 : 400 }}>РУ</span>
            <span className="mx-1.5" style={{ color: 'rgba(255,255,255,0.2)' }}>|</span>
            <span style={{ color: lang === 'en' ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.35)', fontWeight: lang === 'en' ? 700 : 400 }}>EN</span>
          </button>
        </div>

        <div className="flex items-center gap-2.5 px-2.5 py-3 lg:py-2 rounded-lg hover:bg-white/[0.05] transition-colors">
          <div className="w-7 h-7 lg:w-6 lg:h-6 flex items-center justify-center text-[11px] font-semibold shrink-0" style={{ backgroundColor: '#1a3020', color: '#f7f3ed', borderRadius: '6px' }}>
            {initials}
          </div>
          <p className="text-[13px] font-medium text-white/60 truncate flex-1">{firstName}</p>
          <LogoutButton />
        </div>
      </div>
    </>
  )

  return (
    <div className="flex min-h-[100dvh] lg:h-screen lg:overflow-hidden bg-[#ede7dd]">
      <TourModal show={showTour} onClose={() => setShowTour(false)} />

      {/* Затемнение фона (мобильный) */}
      <div
        className={`fixed inset-0 bg-black/60 z-30 lg:hidden transition-opacity duration-200 ${open ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={() => setOpen(false)}
      />

      {/* Sidebar */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-40
        w-[260px] lg:w-[220px]
        flex flex-col shrink-0
        transition-transform duration-300 ease-in-out
        ${open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `} style={{ backgroundColor: 'var(--color-sidebar)' }}>
        {sidebarInner}
      </aside>

      {/* Основная область */}
      <div className="flex-1 min-w-0 flex flex-col lg:overflow-hidden">

        {/* Мобильная шапка (скрыта на desktop) */}
        <header className="lg:hidden flex items-center justify-between px-4 h-12 border-b border-white/[0.07] shrink-0 sticky top-0 z-20" style={{ backgroundColor: 'var(--color-sidebar)' }}>
          <button
            onClick={() => setOpen(true)}
            className="flex items-center justify-center w-10 h-10 -ml-2 text-white/50 hover:text-white/90 transition-colors rounded-lg"
            aria-label={t(lang).nav.openMenu}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            </svg>
          </button>

          {/* Логотип — по центру */}
          <Link href="/dashboard" className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2">
            <svg width="22" height="22" viewBox="0 0 36 36" fill="none">
              <ellipse cx="13" cy="18" rx="7" ry="11"
                transform="rotate(-15 13 18)"
                fill="#7dd4a8" opacity="0.9"/>
              <ellipse cx="23" cy="18" rx="7" ry="11"
                transform="rotate(15 23 18)"
                fill="#f7f3ed" opacity="0.45"/>
              <path d="M18 8 Q18 18 18 28"
                stroke="#1a3020" strokeWidth="0.8"
                strokeLinecap="round"/>
            </svg>
            <span style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: '20px', fontWeight: '400', color: '#f7f3ed', letterSpacing: '0.02em' }}>Similia</span>
          </Link>

          {/* Аватар */}
          <div className="w-8 h-8 flex items-center justify-center text-[11px] font-semibold" style={{ backgroundColor: '#1a3020', color: '#f7f3ed', borderRadius: '8px' }}>
            {initials}
          </div>
        </header>

        {/* Контент */}
        <main className="flex-1 lg:overflow-y-auto min-w-0">
          {children}
        </main>
      </div>
    </div>
  )
}
