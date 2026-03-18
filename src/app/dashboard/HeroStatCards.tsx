'use client'

import { useRouter } from 'next/navigation'

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
  // Перезапуск анимации через reflow
  void el.offsetWidth
  el.classList.add('highlight-flash')
  setTimeout(() => el.classList.remove('highlight-flash'), 1200)
}

function scrollTo(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

export default function HeroStatCards({ todayCount, totalPatients, pendingCount, filterPending, todayLabel, patientsLabel, noPrescriptionLabel }: Props) {
  const router = useRouter()

  function handleToday() {
    scrollTo('appointments-section')
    flash('appointments-section')
  }

  function handlePatients() {
    scrollTo('patients-section')
  }

  function handlePending() {
    if (filterPending) {
      router.push('/dashboard#patients-section')
    } else {
      router.push('?filter=pending#patients-section')
    }
    setTimeout(() => {
      scrollTo('patients-section')
      flash('patients-section')
    }, 100)
  }

  const numStyle: React.CSSProperties = {
    fontFamily: 'var(--font-cormorant, Georgia, serif)',
    color: 'rgba(255,255,255,0.9)',
  }
  const labelStyle: React.CSSProperties = { color: 'rgba(255,255,255,0.45)' }

  return (
    <div className="grid grid-cols-3 gap-2 sm:gap-3">
      <button
        onClick={handleToday}
        className="text-left rounded-xl px-3 py-3 transition-opacity hover:opacity-75"
        style={{ background: 'rgba(255,255,255,0.08)' }}
      >
        <p className="text-[22px] sm:text-[26px] font-light leading-none" style={numStyle}>{todayCount}</p>
        <p className="text-[10px] mt-1" style={labelStyle}>{todayLabel}</p>
      </button>

      <button
        onClick={handlePatients}
        className="text-left rounded-xl px-3 py-3 transition-opacity hover:opacity-75"
        style={{ background: 'rgba(255,255,255,0.08)' }}
      >
        <p className="text-[22px] sm:text-[26px] font-light leading-none" style={numStyle}>{totalPatients}</p>
        <p className="text-[10px] mt-1" style={labelStyle}>{patientsLabel}</p>
      </button>

      <button
        onClick={handlePending}
        className="text-left rounded-xl px-3 py-3 transition-opacity hover:opacity-75"
        style={{ background: pendingCount > 0 ? 'rgba(200,160,53,0.18)' : 'rgba(255,255,255,0.08)' }}
      >
        <p className="text-[22px] sm:text-[26px] font-light leading-none" style={{ ...numStyle, color: pendingCount > 0 ? 'var(--color-amber)' : 'rgba(255,255,255,0.9)' }}>{pendingCount}</p>
        <p className="text-[10px] mt-1" style={labelStyle}>{noPrescriptionLabel}</p>
      </button>
    </div>
  )
}
