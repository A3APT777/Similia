'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import LogoutButton from './LogoutButton'
import { useLanguage } from '@/hooks/useLanguage'
import { t } from '@/lib/shared/i18n'
import FeedbackModal from './FeedbackModal'
import SubscriptionBadge from './SubscriptionBadge'
import type { SubscriptionInfo } from '@/lib/subscription'
import { IconHome, IconBook, IconAI, IconUser, IconSettings, IconReferral, IconAdmin, IconFeedback } from './icons'
import BottomNav from './BottomNav'

type Props = {
  firstName: string
  initials: string
  subscription?: SubscriptionInfo
  patientCount?: number
  realPatientCount?: number
  isAdmin?: boolean
  children: React.ReactNode
}

export default function SidebarShell({ firstName, initials, subscription, patientCount, realPatientCount = 0, isAdmin, children }: Props) {
  const [open, setOpen] = useState(false)
  const [showFeedback, setShowFeedback] = useState(false)
  const pathname = usePathname()
  const { lang, toggle } = useLanguage()

  useEffect(() => { setOpen(false) }, [pathname])
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  // ─── Nav Link ───
  const navLink = (href: string, label: string, icon: React.ReactNode, tourId?: string) => {
    const isActive = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
    return (
      <Link
        href={href}
        onClick={() => setOpen(false)}
        data-tour={tourId}
        className="sb-nav-link group"
        data-active={isActive || undefined}
      >
        {isActive && <span className="sb-active-indicator" />}
        <span className="sb-icon">{icon}</span>
        <span>{label}</span>
      </Link>
    )
  }

  // Иконки из @/components/icons.tsx

  const sidebarContent = (
    <>
      <style>{`
        /* ─── Animations ─── */
        @keyframes sb-indicator-in {
          from { transform: translateY(-50%) scaleY(0); opacity: 0; }
          to { transform: translateY(-50%) scaleY(1); opacity: 1; }
        }
        @keyframes sb-fade-in {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes sb-glow-pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(125,212,168,0); }
          50% { box-shadow: 0 0 8px 2px rgba(125,212,168,0.15); }
        }

        /* ─── Nav Link ─── */
        .sb-nav-link {
          position: relative;
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 9px 16px;
          margin: 1px 8px;
          border-radius: 100px;
          font-size: 13.5px;
          font-weight: 450;
          letter-spacing: 0.01em;
          color: rgba(255,255,255,0.38);
          text-decoration: none;
          transition: all 250ms cubic-bezier(0.4, 0, 0.2, 1);
          transform: translateX(0);
        }
        .sb-nav-link:hover {
          color: rgba(255,255,255,0.88);
          background: rgba(255,255,255,0.06);
          transform: translateX(3px);
        }
        .sb-nav-link[data-active] {
          color: rgba(255,255,255,0.95);
          background: rgba(255,255,255,0.08);
          transform: translateX(0);
        }

        /* Active indicator — animated entrance */
        .sb-active-indicator {
          position: absolute;
          left: -1px;
          top: 50%;
          width: 3px;
          height: 18px;
          border-radius: 0 4px 4px 0;
          background: linear-gradient(180deg, #7dd4a8, #4ebb8a);
          animation: sb-indicator-in 300ms cubic-bezier(0.34, 1.56, 0.64, 1) both;
          box-shadow: 0 0 8px rgba(125,212,168,0.3);
        }

        /* Icon — smooth transitions + glow on active */
        .sb-icon {
          flex-shrink: 0;
          opacity: 0.3;
          transition: all 250ms cubic-bezier(0.4, 0, 0.2, 1);
          filter: drop-shadow(0 0 0 transparent);
        }
        .sb-nav-link:hover .sb-icon {
          opacity: 0.65;
          transform: scale(1.05);
        }
        .sb-nav-link[data-active] .sb-icon {
          opacity: 0.85;
          filter: drop-shadow(0 0 4px rgba(125,212,168,0.25));
        }

        /* Section labels — staggered fade in */
        .sb-section-label {
          padding: 0 24px;
          margin-bottom: 8px;
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: rgba(255,255,255,0.13);
          animation: sb-fade-in 500ms ease both;
        }
        .sb-section-label:nth-of-type(1) { animation-delay: 100ms; }
        .sb-section-label:nth-of-type(2) { animation-delay: 200ms; }
        .sb-section-label:nth-of-type(3) { animation-delay: 300ms; }

        /* User avatar hover glow */
        .sb-avatar {
          transition: all 300ms ease;
        }
        .sb-avatar:hover {
          animation: sb-glow-pulse 2s ease infinite;
        }
      `}</style>

      {/* ─── Logo ─── */}
      <div className="h-[72px] px-6 flex items-center shrink-0">
        <Link href="/dashboard" onClick={() => setOpen(false)} className="flex items-center gap-3">
          <svg width="28" height="28" viewBox="0 0 36 36" fill="none">
            <ellipse cx="13" cy="18" rx="7" ry="11" transform="rotate(-15 13 18)" fill="#7dd4a8" opacity="0.9"/>
            <ellipse cx="23" cy="18" rx="7" ry="11" transform="rotate(15 23 18)" fill="#f7f3ed" opacity="0.4"/>
          </svg>
          <span style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: '21px', fontWeight: 300, color: '#f7f3ed', letterSpacing: '0.04em' }}>
            Similia
          </span>
        </Link>
        <div className="flex-1" />
        <button onClick={() => setOpen(false)} className="lg:hidden p-1 text-white/20 hover:text-white/50 transition-colors">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* ─── Navigation — all visible, some locked ─── */}
      <nav data-tour="sidebar" className="flex-1 overflow-y-auto pt-4 pb-4">
        {/* Primary */}
        <div className="space-y-0.5 mb-5">
          {navLink('/dashboard', t(lang).nav.home, IconHome, 'nav-dashboard')}
          {navLink('/repertory', lang === 'ru' ? 'Реперторий' : 'Repertory', IconBook, 'nav-repertory')}
          {navLink('/ai-consultation', lang === 'ru' ? 'AI-анализ' : 'AI Analysis', IconAI, 'nav-ai')}
          {navLink('/patients/new', t(lang).nav.newPatient, IconUser, 'new-patient')}
        </div>

        {/* Separator */}
        <div className="h-px mx-6 mb-5" style={{ background: 'rgba(255,255,255,0.06)' }} />

        {/* Secondary */}
        <div className="space-y-0.5">
          {navLink('/settings', t(lang).nav.settings, IconSettings, 'nav-settings')}
          {navLink('/referral', lang === 'ru' ? 'Рефералы' : 'Referrals', IconReferral, 'nav-referral')}
          {isAdmin && navLink('/admin', lang === 'ru' ? 'Админ' : 'Admin', IconAdmin, 'nav-admin')}
          <button
            onClick={() => setShowFeedback(true)}
            className="sb-nav-link w-full text-left"
          >
            <span className="sb-icon">{IconFeedback}</span>
            <span>{lang === 'ru' ? 'Обратная связь' : 'Feedback'}</span>
          </button>
        </div>
      </nav>

      {/* ─── Bottom area ─── */}
      <div className="shrink-0 px-4 pb-4 space-y-3">
        {/* Subscription */}
        {subscription && (
          <div className="px-2">
            <SubscriptionBadge subscription={subscription} patientCount={patientCount ?? 0} lang={lang} />
          </div>
        )}

        {/* Divider */}
        <div className="h-px mx-2" style={{ background: 'linear-gradient(to right, transparent, rgba(255,255,255,0.08), transparent)' }} />

        {/* User */}
        <div className="flex items-center gap-3 px-3 py-2">
          <div className="sb-avatar w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-semibold shrink-0" style={{ background: 'rgba(125,212,168,0.15)', color: '#7dd4a8' }}>
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-medium text-white/50 truncate">{firstName}</p>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={toggle}
              className="text-[11px] font-medium px-2.5 py-1.5 rounded-full transition-colors"
              style={{ color: 'rgba(255,255,255,0.3)' }}
              title={lang === 'ru' ? 'Switch language' : 'Сменить язык'}
            >
              {lang === 'ru' ? 'EN' : 'РУ'}
            </button>
            <LogoutButton />
          </div>
        </div>
      </div>
    </>
  )

  return (
    <div className="flex min-h-[100dvh] lg:h-screen lg:overflow-hidden" style={{ backgroundColor: '#f7f3ed' }}>
      <FeedbackModal open={showFeedback} onClose={() => setShowFeedback(false)} />

      {/* Overlay */}
      <div
        className={`fixed inset-0 z-30 lg:hidden transition-opacity duration-300 ${open ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        style={{ backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
        onClick={() => setOpen(false)}
      />

      {/* Sidebar */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-40
        w-[260px] lg:w-[240px]
        flex flex-col shrink-0
        transition-transform duration-[400ms] ease-[cubic-bezier(0.34,1.56,0.64,1)]
        ${open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `} style={{ background: 'linear-gradient(180deg, #1E3A2B 0%, #1A3326 40%, #172E23 100%)' }}>
        {sidebarContent}
      </aside>

      {/* Main */}
      <div className="flex-1 min-w-0 flex flex-col lg:overflow-hidden">
        {/* Mobile header */}
        <header className="lg:hidden flex items-center justify-between px-4 h-14 shrink-0 sticky top-0 z-20" style={{ backgroundColor: '#1E3A2B', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <button
            onClick={() => setOpen(true)}
            className="flex items-center justify-center w-10 h-10 -ml-2 text-white/40 hover:text-white/80 transition-colors"
            aria-label={t(lang).nav.openMenu}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            </svg>
          </button>
          <Link href="/dashboard" className="flex items-center gap-2">
            <svg width="22" height="22" viewBox="0 0 36 36" fill="none">
              <ellipse cx="13" cy="18" rx="7" ry="11" transform="rotate(-15 13 18)" fill="#7dd4a8" opacity="0.9"/>
              <ellipse cx="23" cy="18" rx="7" ry="11" transform="rotate(15 23 18)" fill="#f7f3ed" opacity="0.4"/>
            </svg>
            <span style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: '18px', fontWeight: 300, color: '#f7f3ed' }}>Similia</span>
          </Link>
          <div className="w-10" />
        </header>

        {/* Content */}
        <div className="flex-1 lg:overflow-y-auto pb-14 lg:pb-0">
          {children}
        </div>

        {/* Mobile bottom nav */}
        <BottomNav onOpenMenu={() => setOpen(true)} />
      </div>
    </div>
  )
}
