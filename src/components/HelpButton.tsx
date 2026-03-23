'use client'

import { useState } from 'react'
import Link from 'next/link'

const HELP_ITEMS = [
  {
    question: 'Как добавить пациента?',
    answer: 'На дашборде нажмите «+ Добавить пациента» или отправьте анкету по ссылке.',
  },
  {
    question: 'Как провести приём?',
    answer: 'Откройте карточку пациента → «Начать приём» → заполните жалобы → назначьте препарат.',
  },
  {
    question: 'Как работает реперторий?',
    answer: 'В консультации нажмите «Реперторий». Введите симптом на русском или латыни. Добавьте рубрики кнопкой +.',
  },
]

export default function HelpButton() {
  const [open, setOpen] = useState(false)

  return (
    <>
      {/* Плавающая кнопка */}
      <button
        onClick={() => setOpen(!open)}
        className="fixed bottom-6 right-6 z-[9000] w-12 h-12 rounded-full shadow-lg flex items-center justify-center text-white text-lg font-bold transition-all hover:scale-110"
        style={{ backgroundColor: 'var(--sim-green)' }}
        aria-label="Помощь"
      >
        ?
      </button>

      {/* Панель помощи */}
      {open && (
        <div
          className="fixed bottom-20 right-6 z-[9000] w-80 rounded-2xl shadow-xl overflow-hidden"
          style={{ backgroundColor: 'var(--sim-bg-card)', border: '1px solid var(--sim-border)' }}
        >
          <div className="px-4 py-3" style={{ backgroundColor: 'var(--sim-green)' }}>
            <h3 className="text-sm font-semibold text-white">Помощь</h3>
          </div>
          <div className="p-3 space-y-2">
            {HELP_ITEMS.map((item, i) => (
              <details key={i} className="group">
                <summary className="text-sm font-medium cursor-pointer py-2 px-3 rounded-lg transition-colors hover:bg-[var(--sim-bg-muted)]" style={{ color: 'var(--sim-text)' }}>
                  {item.question}
                </summary>
                <p className="text-xs px-3 pb-2 leading-relaxed" style={{ color: 'var(--sim-text-muted)' }}>
                  {item.answer}
                </p>
              </details>
            ))}

            <div className="pt-2 border-t space-y-1" style={{ borderColor: 'var(--sim-border)' }}>
              <button
                onClick={() => {
                  localStorage.removeItem('welcome_shown')
                  localStorage.setItem('onboarding_step', '0')
                  setOpen(false)
                  window.location.reload()
                }}
                className="w-full text-left text-sm py-2 px-3 rounded-lg transition-colors hover:bg-[var(--sim-bg-muted)]"
                style={{ color: 'var(--sim-green)' }}
              >
                Пройти обучение
              </button>
              <Link
                href="mailto:simillia@mail.ru"
                className="block text-sm py-2 px-3 rounded-lg transition-colors hover:bg-[var(--sim-bg-muted)]"
                style={{ color: 'var(--sim-text-muted)' }}
                onClick={() => setOpen(false)}
              >
                Написать нам — simillia@mail.ru
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
