'use client'

import { ClinicalAssessment } from '@/types'

type Props = {
  assessment: ClinicalAssessment
  lang: 'ru' | 'en'
}

// Цвета для каждого типа dynamics-значка
const BADGE_STYLES: Record<string, { color: string; bg: string }> = {
  better:   { color: '#059669', bg: '#ecfdf5' },  // зелёный
  worse:    { color: '#dc2626', bg: '#fef2f2' },  // красный
  new:      { color: '#2563eb', bg: '#eff6ff' },  // синий
  resolved: { color: '#0d9488', bg: '#f0fdfa' },  // бирюзовый
  same:     { color: '#6b7280', bg: '#f3f4f6' },  // серый
}

// Парсим summary-строку типа "7 симпт. 3↑ 0↓ 1+ 2✓ 1="
function parseSummary(summary: string): { icon: string; count: number; type: string }[] {
  const badges: { icon: string; count: number; type: string }[] = []

  const patterns: [RegExp, string, string][] = [
    [/(\d+)\s*↑/, 'better', '\u2191'],
    [/(\d+)\s*↓/, 'worse', '\u2193'],
    [/(\d+)\s*\+/, 'new', '+'],
    [/(\d+)\s*✓/, 'resolved', '\u2713'],
    [/(\d+)\s*=/, 'same', '='],
  ]

  for (const [regex, type, icon] of patterns) {
    const match = summary.match(regex)
    if (match) {
      const count = parseInt(match[1], 10)
      if (count > 0) {
        badges.push({ icon, count, type })
      }
    }
  }

  return badges
}

export default function ClinicalSummaryBlock({ assessment, lang }: Props) {
  const badges = parseSummary(assessment.summary)

  if (badges.length === 0) return null

  // Получаем общее число симптомов
  const totalMatch = assessment.summary.match(/^(\d+)/)
  const totalLabel = totalMatch
    ? (lang === 'ru' ? `${totalMatch[1]} симпт.` : `${totalMatch[1]} sympt.`)
    : null

  return (
    <div style={{ marginBottom: '12px' }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        flexWrap: 'wrap',
      }}>
        {totalLabel && (
          <span style={{
            fontSize: '11px',
            color: '#9ca3af',
            marginRight: '2px',
          }}>
            {totalLabel}
          </span>
        )}
        {badges.map((b) => {
          const style = BADGE_STYLES[b.type] || BADGE_STYLES.same
          return (
            <span
              key={b.type}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '2px',
                padding: '2px 7px',
                borderRadius: '10px',
                fontSize: '12px',
                fontWeight: 500,
                color: style.color,
                backgroundColor: style.bg,
                lineHeight: 1.4,
              }}
            >
              {b.count}{b.icon}
            </span>
          )
        })}
      </div>
    </div>
  )
}
