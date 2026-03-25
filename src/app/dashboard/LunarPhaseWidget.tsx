// Серверный компонент — визуальная фаза луны, CSS-only

const LUNAR_CYCLE = 29.53059
const REF_NEW_MOON = new Date('2000-01-06T18:14:00Z').getTime()

type Phase = {
  name: string
  nameEn: string
  illumination: number
  age: number
  hint: string
}

function getLunarPhase(): Phase {
  const now = Date.now()
  const elapsed = (now - REF_NEW_MOON) / (1000 * 60 * 60 * 24)
  const age = ((elapsed % LUNAR_CYCLE) + LUNAR_CYCLE) % LUNAR_CYCLE
  const illumination = Math.round((1 - Math.cos((2 * Math.PI * age) / LUNAR_CYCLE)) / 2 * 100)

  if (age < 1.85)  return { name: 'Новолуние',          nameEn: 'New Moon',        illumination, age, hint: 'Начало цикла. Симптомы могут смягчаться.' }
  if (age < 7.38)  return { name: 'Растущий серп',       nameEn: 'Waxing Crescent', illumination, age, hint: 'Хорошее время для начала лечения.' }
  if (age < 9.22)  return { name: 'Первая четверть',     nameEn: 'First Quarter',   illumination, age, hint: 'Реакция на препарат активизируется.' }
  if (age < 14.77) return { name: 'Растущая луна',       nameEn: 'Waxing Gibbous',  illumination, age, hint: 'Усиление действия глубоких препаратов.' }
  if (age < 16.61) return { name: 'Полнолуние',          nameEn: 'Full Moon',       illumination, age, hint: 'Возможны обострения у чувствительных пациентов.' }
  if (age < 22.15) return { name: 'Убывающая луна',      nameEn: 'Waning Gibbous',  illumination, age, hint: 'Хорошо для конституциональных препаратов.' }
  if (age < 24.0)  return { name: 'Последняя четверть',  nameEn: 'Last Quarter',    illumination, age, hint: 'Замедление реакции на препарат.' }
  return             { name: 'Старый серп',            nameEn: 'Waning Crescent', illumination, age, hint: 'Подходит для оценки результатов.' }
}

// Вычисляем CSS для тени луны
function getMoonShadow(age: number): { shadowX: string; isWaxing: boolean } {
  const normalizedAge = age / LUNAR_CYCLE // 0..1
  // 0 = новолуние (тёмная), 0.25 = первая четверть, 0.5 = полнолуние, 0.75 = последняя четверть
  if (normalizedAge < 0.5) {
    // Растущая фаза — тень справа → слева
    const progress = normalizedAge * 2 // 0..1
    const offset = Math.round((1 - progress) * 100)
    return { shadowX: `${offset}%`, isWaxing: true }
  } else {
    // Убывающая фаза — тень слева → справа
    const progress = (normalizedAge - 0.5) * 2 // 0..1
    const offset = Math.round(progress * 100)
    return { shadowX: `${offset}%`, isWaxing: false }
  }
}

export default function LunarPhaseWidget({ lang = 'ru' }: { lang?: 'ru' | 'en' }) {
  const phase = getLunarPhase()
  const { isWaxing } = getMoonShadow(phase.age)
  const normalizedAge = phase.age / LUNAR_CYCLE

  // SVG progress ring
  const radius = 28
  const circumference = 2 * Math.PI * radius
  const progressOffset = circumference - (phase.illumination / 100) * circumference

  // Вычисляем clip для тени на луне
  // Новолуние: полностью тёмная, Полнолуние: полностью светлая
  const illuminationFraction = phase.illumination / 100

  return (
    <div
      className="rounded-xl p-4 transition-all duration-200"
      style={{ backgroundColor: 'var(--sim-bg-card)', border: '1px solid var(--sim-border)' }}
    >
      <style>{`
        @keyframes lunar-glow {
          0%, 100% { box-shadow: 0 0 8px rgba(45,106,79,0.08); }
          50% { box-shadow: 0 0 20px rgba(45,106,79,0.18); }
        }
        .lunar-orb {
          animation: lunar-glow 4s ease-in-out infinite;
        }
      `}</style>

      <div className="flex items-center gap-4">
        {/* Луна — визуальная */}
        <div className="relative shrink-0" style={{ width: 64, height: 64 }}>
          {/* Progress ring */}
          <svg
            className="absolute inset-0"
            width="64" height="64"
            viewBox="0 0 64 64"
            style={{ transform: 'rotate(-90deg)' }}
          >
            {/* Фоновый круг */}
            <circle
              cx="32" cy="32" r={radius}
              fill="none"
              stroke="var(--sim-border)"
              strokeWidth="1.5"
            />
            {/* Прогресс */}
            <circle
              cx="32" cy="32" r={radius}
              fill="none"
              stroke="var(--sim-green)"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={progressOffset}
              style={{ transition: 'stroke-dashoffset 1s ease' }}
            />
          </svg>

          {/* Луна — CSS сфера */}
          <div
            className="lunar-orb absolute rounded-full overflow-hidden"
            style={{
              width: 40,
              height: 40,
              top: 12,
              left: 12,
              background: `radial-gradient(circle at ${isWaxing ? '40%' : '60%'} 40%, #f5f0e8 0%, #e8e0d0 50%, #d4c8b0 100%)`,
            }}
          >
            {/* Тень — создаёт эффект фазы */}
            <div
              className="absolute inset-0 rounded-full transition-all duration-1000"
              style={{
                background: normalizedAge < 0.03 || normalizedAge > 0.97
                  // Новолуние — почти полностью тёмная
                  ? 'rgba(30,40,35,0.85)'
                  : normalizedAge > 0.47 && normalizedAge < 0.53
                    // Полнолуние — почти полностью светлая
                    ? 'rgba(30,40,35,0.05)'
                    : isWaxing
                      // Растущая — тень слева
                      ? `linear-gradient(to right, rgba(30,40,35,${0.8 - illuminationFraction * 0.8}) 0%, rgba(30,40,35,0.02) ${Math.round(illuminationFraction * 100)}%)`
                      // Убывающая — тень справа
                      : `linear-gradient(to left, rgba(30,40,35,${0.8 - illuminationFraction * 0.8}) 0%, rgba(30,40,35,0.02) ${Math.round(illuminationFraction * 100)}%)`,
              }}
            />
            {/* Текстура поверхности */}
            <div
              className="absolute inset-0 rounded-full opacity-20"
              style={{
                background: 'radial-gradient(circle at 30% 25%, transparent 40%, rgba(0,0,0,0.08) 100%), radial-gradient(circle at 65% 60%, rgba(0,0,0,0.05) 0%, transparent 50%)',
              }}
            />
          </div>
        </div>

        {/* Текст */}
        <div className="flex-1 min-w-0">
          <p
            className="text-[15px] font-light leading-tight"
            style={{ fontFamily: 'var(--font-cormorant, Georgia, serif)', color: 'var(--sim-text)' }}
          >
            {lang === 'ru' ? phase.name : phase.nameEn}
          </p>
          <p className="text-[11px] mt-0.5 tabular-nums" style={{ color: 'var(--sim-text-muted)' }}>
            {lang === 'ru' ? 'Освещённость' : 'Illumination'} {phase.illumination}%
          </p>
          <p className="text-[12px] mt-1.5 leading-relaxed" style={{ color: 'var(--sim-text-muted)' }}>
            {phase.hint}
          </p>
        </div>
      </div>
    </div>
  )
}
