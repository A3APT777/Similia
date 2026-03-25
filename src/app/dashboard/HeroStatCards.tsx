'use client'

import { useRouter } from 'next/navigation'
import { useRef, useCallback } from 'react'

type Props = {
  todayCount: number
  totalPatients: number
  pendingCount: number
  filterPending: boolean
  todayLabel: string
  patientsLabel: string
  noPrescriptionLabel: string
}

function flash(id: string) {
  const el = document.getElementById(id)
  if (!el) return
  el.classList.remove('highlight-flash')
  void el.offsetWidth
  el.classList.add('highlight-flash')
  setTimeout(() => el.classList.remove('highlight-flash'), 1200)
}

function scrollTo(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

export default function HeroStatCards({
  todayCount, totalPatients, pendingCount, filterPending,
  todayLabel, patientsLabel, noPrescriptionLabel
}: Props) {
  const router = useRouter()
  const cardsRef = useRef<HTMLDivElement>(null)

  const handleToday = useCallback(() => {
    scrollTo('appointments-section')
    flash('appointments-section')
  }, [])

  const handlePatients = useCallback(() => {
    scrollTo('patients-section')
  }, [])

  const handlePending = useCallback(() => {
    if (filterPending) {
      router.push('/dashboard#patients-section')
    } else {
      router.push('?filter=pending#patients-section')
    }
    setTimeout(() => {
      scrollTo('patients-section')
      flash('patients-section')
    }, 100)
  }, [filterPending, router])

  const cards = [
    {
      value: todayCount,
      label: todayLabel,
      onClick: handleToday,
      accent: false,
    },
    {
      value: totalPatients,
      label: patientsLabel,
      onClick: handlePatients,
      accent: false,
    },
    {
      value: pendingCount,
      label: noPrescriptionLabel,
      onClick: handlePending,
      accent: pendingCount > 0,
    },
  ]

  return (
    <div ref={cardsRef} className="grid grid-cols-3 gap-px rounded-xl overflow-hidden" style={{ backgroundColor: 'var(--sim-border)' }}>
      {cards.map((card, i) => (
        <button
          key={i}
          onClick={card.onClick}
          aria-label={`${card.value} ${card.label}`}
          className="group relative text-left transition-all duration-300 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sim-green)] focus-visible:ring-inset"
          style={{ backgroundColor: 'var(--sim-bg-card)' }}
        >
          {/* Фоновый акцент при hover */}
          <div
            className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
            style={{ background: card.accent ? 'rgba(245,158,11,0.04)' : 'rgba(45,106,79,0.03)' }}
          />

          <div className="relative px-4 sm:px-5 py-4 sm:py-5">
            {/* Число — монументальное */}
            <p
              className="text-[28px] sm:text-[36px] lg:text-[42px] font-light leading-[1] tracking-[-0.02em] transition-transform duration-300 group-hover:translate-y-[-1px]"
              style={{
                fontFamily: 'var(--font-cormorant, Georgia, serif)',
                color: card.accent ? 'var(--sim-amber, #b45309)' : 'var(--sim-green)',
              }}
            >
              {card.value}
            </p>

            {/* Подпись — утончённая */}
            <p
              className="mt-1.5 sm:mt-2 text-[10px] sm:text-[11px] font-medium uppercase tracking-[0.12em] leading-tight transition-colors duration-300"
              style={{ color: 'var(--sim-text-muted)' }}
            >
              {card.label}
            </p>
          </div>

          {/* Нижняя линия-индикатор при hover */}
          <div
            className="absolute bottom-0 left-1/2 -translate-x-1/2 h-[2px] w-0 group-hover:w-[60%] transition-all duration-500 ease-out rounded-full"
            style={{ backgroundColor: card.accent ? 'var(--sim-amber, #b45309)' : 'var(--sim-green)' }}
          />
        </button>
      ))}
    </div>
  )
}
