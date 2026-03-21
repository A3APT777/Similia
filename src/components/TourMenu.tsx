'use client'

import { useState } from 'react'
import { TOUR_BLOCKS, startTourFromStep, startFullTour } from './InteractiveTour'

export default function TourMenu() {
  const [open, setOpen] = useState(false)

  function handleBlock(startStep: number) {
    setOpen(false)
    startTourFromStep(startStep)
  }

  function handleFull() {
    setOpen(false)
    startFullTour()
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-[13px] transition-all border"
        style={{ color: 'rgba(125,212,168,0.85)', borderColor: 'rgba(125,212,168,0.2)', backgroundColor: 'rgba(125,212,168,0.05)' }}
      >
        <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342M6.75 15a.75.75 0 100-1.5.75.75 0 000 1.5zm0 0v-3.675A55.378 55.378 0 0112 8.443m-7.007 11.55A5.981 5.981 0 006.75 15.75v-1.5" />
        </svg>
        Обучение
        <svg className={`w-3 h-3 ml-auto transition-transform ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        </svg>
      </button>

      {open && (
        <>
          {/* Клик за пределами — закрыть */}
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div
            className="absolute bottom-full left-0 right-0 mb-1 rounded-xl overflow-hidden z-50"
            style={{ backgroundColor: 'var(--sim-forest)', border: '1px solid rgba(125,212,168,0.2)', boxShadow: '0 -8px 32px rgba(0,0,0,0.3)' }}
          >
            {TOUR_BLOCKS.map(block => (
              <button
                key={block.id}
                onClick={() => handleBlock(block.startStep)}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left text-[12px] transition-colors hover:bg-white/10"
                style={{ color: 'rgba(255,255,255,0.8)' }}
              >
                <span className="text-sm">{block.emoji}</span>
                <span>{block.label}</span>
              </button>
            ))}
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)' }}>
              <button
                onClick={handleFull}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left text-[12px] transition-colors hover:bg-white/10"
                style={{ color: 'var(--sim-amber)' }}
              >
                <span className="text-sm">🔄</span>
                <span>Пройти весь тур заново</span>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
