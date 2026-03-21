'use client'

import { type ReactNode, type CSSProperties } from 'react'

// Универсальная AI-кнопка с 3D/glow эффектом
// Использует CSS-классы из theme.css: .btn .btn-ai .btn-ai-outline

type Variant = 'primary' | 'outline' | 'sm' | 'lg'

type Props = {
  children: ReactNode
  onClick?: () => void
  disabled?: boolean
  loading?: boolean
  variant?: Variant
  className?: string
  style?: CSSProperties
  href?: string
  type?: 'button' | 'submit'
}

// Иконка-искорка для AI
const SparkleIcon = ({ className = 'w-4 h-4' }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
  </svg>
)

// Спиннер загрузки
const Spinner = () => (
  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
  </svg>
)

export default function AIButton({
  children,
  onClick,
  disabled,
  loading,
  variant = 'primary',
  className = '',
  style,
  type = 'button',
}: Props) {
  const sizeClass = variant === 'sm' ? 'btn-sm' : variant === 'lg' ? 'btn-lg' : ''
  const variantClass = variant === 'outline' ? 'btn-ai-outline' : 'btn-ai'

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`btn ${variantClass} ${sizeClass} ${className}`}
      style={style}
    >
      {loading ? <Spinner /> : <SparkleIcon className={variant === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4'} />}
      {children}
    </button>
  )
}

export { SparkleIcon }
