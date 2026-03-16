'use client'

import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react'

type ToastType = 'success' | 'error' | 'info'

type Toast = {
  id: string
  message: string
  type: ToastType
}

type ToastContextValue = {
  toast: (message: string, type?: ToastType) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const toast = useCallback((message: string, type: ToastType = 'success') => {
    const id = Math.random().toString(36).slice(2)
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 3500)
  }, [])

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map(t => (
          <ToastItem key={t.id} toast={t} onClose={() => setToasts(prev => prev.filter(x => x.id !== t.id))} />
        ))}
      </div>
    </ToastContext.Provider>
  )
}

function ToastItem({ toast, onClose }: { toast: Toast; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    requestAnimationFrame(() => {
      el.style.opacity = '1'
      el.style.transform = 'translateY(0)'
    })
  }, [])

  const colors = {
    success: { bg: '#f0f7f3', border: '1px solid #2d6a4f', textColor: '#1a3020', icon: '✓', iconBg: 'rgba(45,106,79,0.12)', iconColor: '#2d6a4f' },
    error:   { bg: '#fef0f0', border: '1px solid #c0392b', textColor: '#c0392b', icon: '✕', iconBg: 'rgba(192,57,43,0.12)', iconColor: '#c0392b' },
    info:    { bg: '#fff8e8', border: '1px solid #c8a035', textColor: '#8a5f00', icon: 'i', iconBg: 'rgba(200,160,53,0.12)', iconColor: '#c8a035' },
  }
  const c = colors[toast.type]

  return (
    <div
      ref={ref}
      className="pointer-events-auto flex items-center gap-3 px-4 py-3 shadow-lg min-w-[240px] max-w-[340px] cursor-pointer"
      style={{
        backgroundColor: c.bg,
        border: c.border,
        borderRadius: '8px',
        opacity: 0,
        transform: 'translateY(8px)',
        transition: 'opacity 0.2s ease, transform 0.2s ease',
      }}
      onClick={onClose}
    >
      <span className="w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0" style={{ backgroundColor: c.iconBg, color: c.iconColor }}>
        {c.icon}
      </span>
      <p className="text-[13px] flex-1" style={{ color: c.textColor }}>{toast.message}</p>
    </div>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used inside ToastProvider')
  return ctx
}
