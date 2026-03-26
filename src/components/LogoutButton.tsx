'use client'

import { signOut } from 'next-auth/react'
import { t } from '@/lib/i18n'
import { useLanguage } from '@/hooks/useLanguage'

export default function LogoutButton({ dark = true }: { dark?: boolean }) {
  const { lang } = useLanguage()

  async function handleLogout() {
    await signOut({ callbackUrl: '/login' })
  }

  return (
    <button
      onClick={handleLogout}
      title={t(lang).nav.logout}
      className={`shrink-0 p-1.5 rounded-md transition-colors ${
        dark
          ? 'text-white/20 hover:text-white/50 hover:bg-white/[0.07]'
          : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
      }`}
    >
      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
      </svg>
    </button>
  )
}
