'use client'

import { ClinicalAssessment } from '@/types'

type Props = {
  assessment: ClinicalAssessment
  lang: 'ru' | 'en'
}

const BADGE_STYLES: Record<string, { color: string; bg: string }> = {
  better:   { color: '#059669', bg: '#ecfdf5' },
  worse:    { color: '#dc2626', bg: '#fef2f2' },
  new:      { color: '#2563eb', bg: '#eff6ff' },
  resolved: { color: '#0d9488', bg: '#f0fdfa' },
  same:     { color: '#6b7280', bg: '#f3f4f6' },
}

function parseSummary(summary: string): { icon: string; count: number; type: string }[] {
  const patterns: [RegExp, string, string][] = [
    [/(\d+)\s*↑/, 'better', '↑'],
    [/(\d+)\s*↓/, 'worse', '↓'],
    [/(\d+)\s*\+/, 'new', '+'],
    [/(\d+)\s*✓/, 'resolved', '✓'],
    [/(\d+)\s*=/, 'same', '='],
  ]
  return patterns.flatMap(([regex, type, icon]) => {
    const match = summary.match(regex)
    if (!match) return []
    const count = parseInt(match[1], 10)
    return count > 0 ? [{ icon, count, type }] : []
  })
}

export default function ClinicalSummaryBlock({ assessment, lang }: Props) {
  const badges = parseSummary(assessment.summary)

  if (badges.length === 0) return null

  const totalMatch = assessment.summary.match(/^(\d+)/)
  const totalLabel = totalMatch
    ? (lang === 'ru' ? `${totalMatch[1]} симпт.` : `${totalMatch[1]} sympt.`)
    : null

  return (
    <div className="flex items-center gap-1.5 flex-wrap mb-3">
      {totalLabel && (
        <span className="text-xs text-gray-400 mr-0.5">{totalLabel}</span>
      )}
      {badges.map((b) => {
        const s = BADGE_STYLES[b.type] || BADGE_STYLES.same
        return (
          <span
            key={b.type}
            className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-[10px] text-xs font-medium leading-snug"
            style={{ color: s.color, backgroundColor: s.bg }}
          >
            {b.count}{b.icon}
          </span>
        )
      })}
    </div>
  )
}
