'use client'

import { useEffect } from 'react'

type Props = {
  open: boolean
  onClose: () => void
}

const EMAIL = 'simillia@mail.ru'

export default function FeedbackModal({ open, onClose }: Props) {
  // Закрытие по Escape
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  // Блокировка скролла body
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  if (!open) return null

  const subject = encodeURIComponent('Обратная связь — Similia')
  const mailtoHref = `mailto:${EMAIL}?subject=${subject}`

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(3px)' }}
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Обратная связь"
        className="w-full max-w-sm rounded-xl overflow-hidden shadow-2xl"
        style={{ backgroundColor: 'var(--sim-bg)', border: '1px solid var(--sim-border)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Шапка */}
        <div
          className="px-5 py-4 flex items-center justify-between"
          style={{ backgroundColor: 'var(--sim-forest)' }}
        >
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
              style={{ backgroundColor: 'rgba(125,212,168,0.15)' }}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} style={{ color: '#7dd4a8' }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
              </svg>
            </div>
            <div>
              <p
                className="text-[17px] font-light leading-none"
                style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", color: '#f7f3ed' }}
              >
                Обратная связь
              </p>
              <p className="text-xs mt-0.5" style={{ color: 'rgba(247,243,237,0.4)' }}>Similia</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-full transition-colors"
            style={{ color: 'rgba(247,243,237,0.35)' }}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Контент */}
        <div className="px-5 py-5 space-y-4">
          <p className="text-[13px] leading-relaxed" style={{ color: '#3a2e1a' }}>
            Нашли ошибку, что-то не работает или хотите предложить улучшение?
            Пишите — читаем каждое письмо и отвечаем лично.
          </p>

          {/* Email-блок */}
          <div
            className="rounded-xl px-4 py-3.5"
            style={{ backgroundColor: '#e8e0d4', border: '1px solid var(--sim-border)' }}
          >
            <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: 'var(--sim-text-hint)' }}>
              Почта для связи
            </p>
            <p
              className="text-[15px] font-medium"
              style={{ color: 'var(--sim-forest)', fontFamily: "'Cormorant Garamond', Georgia, serif" }}
            >
              {EMAIL}
            </p>
          </div>

          {/* Что писать */}
          <div className="space-y-1.5">
            {[
              'Опишите ошибку и что происходило перед ней',
              'Укажите браузер и устройство',
              'Предложения по улучшению тоже приветствуются',
            ].map((hint, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="mt-[6px] w-1 h-1 rounded-full shrink-0" style={{ backgroundColor: 'var(--sim-text-muted)' }} />
                <p className="text-[12px] leading-relaxed" style={{ color: '#6b5e45' }}>{hint}</p>
              </div>
            ))}
          </div>

          {/* Кнопка */}
          <a
            href={mailtoHref}
            className="flex items-center justify-center gap-2 w-full py-3 rounded-xl text-sm font-semibold transition-all"
            style={{ backgroundColor: 'var(--sim-forest)', color: '#f7f3ed' }}
          >
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
            </svg>
            Написать письмо
          </a>

          <p className="text-center text-xs" style={{ color: '#c4b89a' }}>
            Или напишите напрямую на {EMAIL}
          </p>
        </div>
      </div>
    </div>
  )
}
