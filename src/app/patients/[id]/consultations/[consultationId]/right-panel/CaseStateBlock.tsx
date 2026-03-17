'use client'

import { CaseState } from '@/types'
import { CASE_STATE_LABELS, CASE_STATE_COLORS } from '@/lib/clinicalEngine'

type Props = {
  caseState: CaseState
  lang: 'ru' | 'en'
}

export default function CaseStateBlock({ caseState, lang }: Props) {
  const label = CASE_STATE_LABELS[lang][caseState]
  const colors = CASE_STATE_COLORS[caseState]

  return (
    <div style={{ marginBottom: '12px' }}>
      <span style={{
        display: 'inline-block',
        padding: '4px 12px',
        borderRadius: '12px',
        fontSize: '13px',
        fontWeight: 500,
        color: colors.color,
        backgroundColor: colors.bg,
        border: `1px solid ${colors.border}`,
        lineHeight: 1.4,
      }}>
        {label}
      </span>
    </div>
  )
}
