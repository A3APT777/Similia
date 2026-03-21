import type { Metadata } from 'next'
import Link from 'next/link'
import DemoForm from './DemoForm'

export const metadata: Metadata = {
  title: 'AI-демо — Similia',
  description: 'Попробуйте AI-анализ гомеопатического случая бесплатно',
}

export default function DemoPage() {
  return (
    <div className="min-h-screen bg-[#f0ebe3]">
      {/* Хедер — светлый полупрозрачный, как на /pricing */}
      <header
        className="border-b"
        style={{
          backgroundColor: 'rgba(240,235,227,0.85)',
          backdropFilter: 'blur(12px)',
          borderColor: '#d4c9b8',
        }}
      >
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <svg width={24} height={24} viewBox="0 0 36 36" fill="none" aria-hidden="true">
              <ellipse cx="13" cy="18" rx="7" ry="11" transform="rotate(-15 13 18)" fill="#2d6a4f" opacity="0.9" />
              <ellipse cx="23" cy="18" rx="7" ry="11" transform="rotate(15 23 18)" fill="#2d6a4f" opacity="0.65" />
            </svg>
            <span style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: '18px', fontWeight: 500, color: '#2d6a4f' }}>
              Similia
            </span>
          </Link>
          <Link href="/register" className="btn btn-primary text-xs px-4 py-2">
            Регистрация
          </Link>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-10">
        <div className="text-center mb-8">
          {/* Бейдж "Демо" — AI акцент (indigo) */}
          <div
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium mb-4"
            style={{ backgroundColor: 'rgba(99,102,241,0.12)', color: '#6366f1' }}
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
            </svg>
            Демо без AI — алгоритм MDRI
          </div>
          <h1
            className="text-3xl sm:text-4xl font-light mb-3 text-[#1a1a0a]"
            style={{ fontFamily: 'var(--font-cormorant, Georgia, serif)' }}
          >
            Демо MDRI Engine
          </h1>
          <p className="text-sm text-[#3a3020]">
            Упрощённый анализ без AI — только алгоритмический движок (8 линз)
          </p>
          <p className="text-xs mt-2 text-[#9a8a6a]">
            В полной версии AI-гомеопат формирует персональные вопросы, анализирует ответы и дозадаёт уточнения
          </p>
        </div>

        <DemoForm />

        <div className="mt-8 text-center space-y-3">
          <p className="text-xs text-[#9a8a6a]">
            Полная версия включает AI-гомеопата (Sonnet), арбитраж, персональные анкеты и рекомендацию потенции
          </p>
          <Link
            href="/pricing"
            className="btn btn-ai inline-flex text-sm font-semibold px-6 py-2.5 rounded-xl"
          >
            Подключить AI Pro →
          </Link>
        </div>
      </main>
    </div>
  )
}
