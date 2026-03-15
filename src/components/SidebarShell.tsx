'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import LogoutButton from './LogoutButton'

type Props = {
  firstName: string
  initials: string
  children: React.ReactNode
}

export default function SidebarShell({ firstName, initials, children }: Props) {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  // Закрываем drawer при смене страницы
  useEffect(() => { setOpen(false) }, [pathname])

  // Блокируем скролл body когда drawer открыт
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  const navLink = (href: string, label: string, icon: React.ReactNode) => (
    <Link
      href={href}
      onClick={() => setOpen(false)}
      className="flex items-center gap-3 px-3 py-3 lg:py-2 rounded-lg text-[13px] text-white/50 hover:text-white/90 hover:bg-white/[0.07] transition-all group"
    >
      <span className="text-white/30 group-hover:text-white/60 transition-colors shrink-0">
        {icon}
      </span>
      {label}
    </Link>
  )

  const sidebarInner = (
    <>
      {/* Логотип */}
      <div className="px-4 h-[52px] flex items-center justify-between border-b border-white/[0.07] shrink-0">
        <Link href="/dashboard" onClick={() => setOpen(false)} className="flex items-center gap-2.5 group">
          <div className="w-7 h-7 rounded-lg bg-emerald-500 flex items-center justify-center font-bold text-white text-[12px] shadow-lg shadow-emerald-900/40 group-hover:bg-emerald-400 transition-colors shrink-0">
            H
          </div>
          <span className="text-[14px] font-semibold text-white/85 tracking-tight group-hover:text-white transition-colors">
            HomeoCase
          </span>
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
      <nav className="flex-1 px-2 pt-4 pb-2 space-y-0.5 overflow-y-auto">
        <p className="px-3 pb-2 text-[10px] font-semibold text-white/20 uppercase tracking-[0.1em]">
          Рабочий стол
        </p>
        {navLink('/dashboard', 'Главная',
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
          </svg>
        )}

        <div className="pt-3">
          <p className="px-3 pb-2 text-[10px] font-semibold text-white/20 uppercase tracking-[0.1em]">
            Пациенты
          </p>
          {navLink('/patients/new', 'Новый пациент',
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM4 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 0110.374 21c-2.331 0-4.512-.645-6.374-1.766z" />
            </svg>
          )}
        </div>
      </nav>

      {/* Пользователь */}
      <div className="px-2 py-3 border-t border-white/[0.07] shrink-0">
        <div className="flex items-center gap-2.5 px-2.5 py-3 lg:py-2 rounded-lg hover:bg-white/[0.05] transition-colors">
          <div className="w-7 h-7 lg:w-6 lg:h-6 rounded-md bg-emerald-700 flex items-center justify-center text-[11px] font-semibold text-white shrink-0">
            {initials}
          </div>
          <p className="text-[13px] font-medium text-white/60 truncate flex-1">{firstName}</p>
          <LogoutButton />
        </div>
      </div>
    </>
  )

  return (
    <div className="flex min-h-[100dvh] lg:h-screen lg:overflow-hidden bg-[#f9fafb]">

      {/* Затемнение фона (мобильный) */}
      <div
        className={`fixed inset-0 bg-black/60 z-30 lg:hidden transition-opacity duration-200 ${open ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={() => setOpen(false)}
      />

      {/* Sidebar */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-40
        w-[260px] lg:w-[220px]
        bg-[#111827] flex flex-col shrink-0
        transition-transform duration-300 ease-in-out
        ${open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {sidebarInner}
      </aside>

      {/* Основная область */}
      <div className="flex-1 min-w-0 flex flex-col lg:overflow-hidden">

        {/* Мобильная шапка (скрыта на desktop) */}
        <header className="lg:hidden flex items-center justify-between px-4 h-12 bg-[#111827] border-b border-white/[0.07] shrink-0 sticky top-0 z-20">
          <button
            onClick={() => setOpen(true)}
            className="flex items-center justify-center w-10 h-10 -ml-2 text-white/50 hover:text-white/90 transition-colors rounded-lg"
            aria-label="Открыть меню"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            </svg>
          </button>

          {/* Логотип — по центру */}
          <Link href="/dashboard" className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-emerald-500 flex items-center justify-center font-bold text-white text-[11px]">H</div>
            <span className="text-[13px] font-semibold text-white/85">HomeoCase</span>
          </Link>

          {/* Аватар */}
          <div className="w-8 h-8 rounded-md bg-emerald-700 flex items-center justify-center text-[11px] font-semibold text-white">
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
