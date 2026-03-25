'use client'

type Props = {
  id?: string
  label?: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  type?: 'text' | 'email' | 'tel' | 'password' | 'number' | 'date'
  required?: boolean
  autoFocus?: boolean
  className?: string
}

export default function FormInput({
  id,
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  required,
  autoFocus,
  className = '',
}: Props) {
  return (
    <div className={className}>
      {label && (
        <label
          htmlFor={id}
          className="block mb-1.5 text-[11px] font-medium uppercase tracking-[0.1em]"
          style={{ color: 'var(--sim-text-muted)' }}
        >
          {label}
          {required && <span className="text-red-400 ml-0.5">*</span>}
        </label>
      )}
      <input
        id={id}
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        className="w-full px-3.5 py-2.5 text-sm rounded-xl border transition-all duration-200 focus:outline-none"
        style={{
          backgroundColor: 'var(--sim-bg-card)',
          borderColor: 'var(--sim-border)',
          color: 'var(--sim-text)',
        }}
        onFocus={e => {
          e.currentTarget.style.borderColor = 'var(--sim-green)'
          e.currentTarget.style.boxShadow = '0 0 0 3px rgba(45,106,79,0.08)'
        }}
        onBlur={e => {
          e.currentTarget.style.borderColor = 'var(--sim-border)'
          e.currentTarget.style.boxShadow = 'none'
        }}
      />
    </div>
  )
}
