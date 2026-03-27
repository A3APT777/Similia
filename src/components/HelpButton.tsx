'use client'

import { useState } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'

// Страницы где кнопка помощи не нужна (публичные формы пациента)
const HIDDEN_PATHS = ['/intake/', '/followup/', '/upload/', '/survey/', '/new/', '/rx/', '/verify', '/ai-consultation']

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
  const pathname = usePathname()

  // Скрываем на публичных формах пациента
  if (HIDDEN_PATHS.some(p => pathname.startsWith(p))) return null

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
          className="fixed bottom-20 right-6 z-[9000] w-80 rounded-xl shadow-xl overflow-hidden"
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
              <Link
                href="/guide"
                className="block text-sm py-2 px-3 rounded-lg transition-colors hover:bg-[var(--sim-bg-muted)]"
                style={{ color: 'var(--sim-green)' }}
                onClick={() => setOpen(false)}
              >
                Руководство по работе
              </Link>
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
