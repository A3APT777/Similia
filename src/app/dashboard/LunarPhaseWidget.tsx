// Серверный компонент — вычисляет фазу луны без API

const LUNAR_CYCLE = 29.53059 // дней
// Опорная новолуния: 6 января 2000, 18:14 UTC
const REF_NEW_MOON = new Date('2000-01-06T18:14:00Z').getTime()

type Phase = {
  name: string
  nameEn: string
  emoji: string
  illumination: number // 0–100%
  hint: string
}

function getLunarPhase(): Phase {
  const now = Date.now()
  const elapsed = (now - REF_NEW_MOON) / (1000 * 60 * 60 * 24)
  const age = ((elapsed % LUNAR_CYCLE) + LUNAR_CYCLE) % LUNAR_CYCLE
  const illumination = Math.round((1 - Math.cos((2 * Math.PI * age) / LUNAR_CYCLE)) / 2 * 100)

  if (age < 1.85)  return { name: 'Новолуние',          nameEn: 'New Moon',       emoji: '🌑', illumination, hint: 'Хроники: начало нового цикла. Симптомы могут смягчаться.' }
  if (age < 7.38)  return { name: 'Растущий серп',       nameEn: 'Waxing Crescent',emoji: '🌒', illumination, hint: 'Нарастающая фаза — хорошее время для начала лечения.' }
  if (age < 9.22)  return { name: 'Первая четверть',     nameEn: 'First Quarter',  emoji: '🌓', illumination, hint: 'Усиление жизненных сил, реакция на препарат активизируется.' }
  if (age < 14.77) return { name: 'Растущая луна',       nameEn: 'Waxing Gibbous', emoji: '🌔', illumination, hint: 'Нарастающая фаза — усиление действия глубоких препаратов.' }
  if (age < 16.61) return { name: 'Полнолуние',          nameEn: 'Full Moon',      emoji: '🌕', illumination, hint: 'Возможны обострения у чувствительных пациентов. Наблюдайте динамику.' }
  if (age < 22.15) return { name: 'Убывающая луна',      nameEn: 'Waning Gibbous', emoji: '🌖', illumination, hint: 'Убывающая фаза — хорошее время для конституциональных препаратов.' }
  if (age < 24.0)  return { name: 'Последняя четверть',  nameEn: 'Last Quarter',   emoji: '🌗', illumination, hint: 'Снижение реактивности. Возможно замедление реакции на препарат.' }
  return             { name: 'Старый серп',            nameEn: 'Waning Crescent', emoji: '🌘', illumination, hint: 'Завершение цикла. Подходит для оценки результатов лечения.' }
}

export default function LunarPhaseWidget({ lang = 'ru' }: { lang?: 'ru' | 'en' }) {
  const phase = getLunarPhase()

  return (
    <div className="rounded-2xl p-3" style={{ backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border-light)' }}>
      <div className="flex items-center gap-2.5">
        <span className="text-[22px] leading-none select-none">{phase.emoji}</span>
        <div className="flex-1 min-w-0">
          <p className="text-[12px] font-semibold leading-tight" style={{ color: 'var(--sim-text)' }}>
            {lang === 'ru' ? phase.name : phase.nameEn}
            <span className="ml-1.5 text-xs font-normal" style={{ color: 'var(--sim-text-muted)' }}>{phase.illumination}%</span>
          </p>
        </div>
      </div>

      {/* Полоса освещённости */}
      <div className="mt-2 h-1 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(0,0,0,0.07)' }}>
        <div
          className="h-full rounded-full"
          style={{ width: `${phase.illumination}%`, backgroundColor: 'var(--sim-amber)' }}
        />
      </div>

      {/* Подсказка для гомеопата */}
      <p className="mt-1.5 text-xs leading-relaxed" style={{ color: 'var(--sim-text-hint)' }}>
        {phase.hint}
      </p>
    </div>
  )
}
