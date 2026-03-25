'use client'

import { useRef, useCallback, type RefObject } from 'react'

type Variant = 'default' | 'worse' | 'acute' | 'better'

const VARIANT_STYLES: Record<Variant, {
  labelColor: string
  focusBorder: string
  focusShadow: string
  bg: string
}> = {
  default: {
    labelColor: 'var(--sim-text-muted)',
    focusBorder: 'var(--sim-green)',
    focusShadow: '0 0 0 3px rgba(45,106,79,0.08)',
    bg: 'var(--sim-bg-card)',
  },
  better: {
    labelColor: 'var(--sim-green)',
    focusBorder: 'var(--sim-green)',
    focusShadow: '0 0 0 3px rgba(45,106,79,0.08)',
    bg: 'var(--sim-bg-card)',
  },
  worse: {
    labelColor: '#b91c1c',
    focusBorder: '#fca5a5',
    focusShadow: '0 0 0 3px rgba(252,165,165,0.12)',
    bg: 'var(--sim-bg-card)',
  },
  acute: {
    labelColor: '#b45309',
    focusBorder: 'rgba(180,83,9,0.4)',
    focusShadow: '0 0 0 3px rgba(180,83,9,0.06)',
    bg: 'rgba(180,83,9,0.02)',
  },
}

type Props = {
  id?: string
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  rows?: number
  variant?: Variant
  required?: boolean
  autoFocus?: boolean
  nextRef?: RefObject<HTMLTextAreaElement | null>
}

export default function FormTextarea({
  id,
  label,
  value,
  onChange,
  placeholder,
  rows = 2,
  variant = 'default',
  required,
  autoFocus,
  nextRef,
}: Props) {
  const ref = useRef<HTMLTextAreaElement>(null)
  const styles = VARIANT_STYLES[variant]

  const autoResize = useCallback((el: HTMLTextAreaElement) => {
    el.style.height = 'auto'
    el.style.height = el.scrollHeight + 'px'
  }, [])

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Tab' && !e.shiftKey && nextRef) {
      e.preventDefault()
      nextRef.current?.focus()
    }
  }

  return (
    <div>
      <label
        htmlFor={id}
        className="block mb-1.5 text-[11px] font-medium uppercase tracking-[0.1em]"
        style={{ color: styles.labelColor }}
      >
        {label}
        {required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      <textarea
        id={id}
        ref={ref}
        value={value}
        onChange={e => {
          onChange(e.target.value)
          autoResize(e.target)
        }}
        onInput={e => autoResize(e.currentTarget)}
        onKeyDown={nextRef ? handleKeyDown : undefined}
        placeholder={placeholder}
        rows={rows}
        autoFocus={autoFocus}
        className="w-full resize-none rounded-xl border px-3.5 py-2.5 text-sm leading-relaxed transition-all duration-200 focus:outline-none"
        style={{
          borderColor: 'var(--sim-border)',
          backgroundColor: styles.bg,
          color: 'var(--sim-text)',
        }}
        onFocus={e => {
          e.currentTarget.style.borderColor = styles.focusBorder
          e.currentTarget.style.boxShadow = styles.focusShadow
        }}
        onBlur={e => {
          e.currentTarget.style.borderColor = 'var(--sim-border)'
          e.currentTarget.style.boxShadow = 'none'
        }}
      />
    </div>
  )
}
