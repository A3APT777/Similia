'use client'

import { useState, useEffect } from 'react'

type Props = {
  name: string
  status: { label: string; color: string }
  remedy?: string | null
  potency?: string | null
}

export default function StickyPatientHeader({ name, status, remedy, potency }: Props) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    function onScroll() {
      setVisible(window.scrollY > 140)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  if (!visible) return null

  return (
    <div
      className="fixed top-0 left-0 right-0 z-40 transition-all duration-200"
      style={{
        backgroundColor: 'rgba(247,243,237,0.95)',
        backdropFilter: 'blur(8px)',
        borderBottom: '1px solid var(--sim-border)',
      }}
    >
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-2 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className="w-2 h-2 rounded-full shrink-0"
            style={{ backgroundColor: status.color }}
          />
          <span className="text-[14px] font-semibold truncate" style={{ color: 'var(--sim-text)', fontFamily: 'var(--sim-font-serif)' }}>
            {name}
          </span>
        </div>
        {remedy && (
          <span className="text-[13px] font-bold shrink-0" style={{ color: 'var(--sim-forest)' }}>
            {remedy} {potency}
          </span>
        )}
      </div>
    </div>
  )
}
