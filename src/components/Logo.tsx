// Логотип Similia — единый компонент для всего проекта
type LogoVariant = 'default' | 'light'

interface LogoProps {
  size?: number
  variant?: LogoVariant
}

export default function Logo({ size = 24, variant = 'default' }: LogoProps) {
  const isLight = variant === 'light'

  return (
    <svg width={size} height={size} viewBox="0 0 36 36" fill="none">
      <ellipse
        cx="13" cy="18" rx="7" ry="11"
        transform="rotate(-15 13 18)"
        fill={isLight ? '#7dd4a8' : 'var(--sim-green)'}
        opacity="0.9"
      />
      <ellipse
        cx="23" cy="18" rx="7" ry="11"
        transform="rotate(15 23 18)"
        fill={isLight ? '#f7f3ed' : 'var(--sim-forest)'}
        opacity={isLight ? 0.45 : 0.65}
      />
    </svg>
  )
}
