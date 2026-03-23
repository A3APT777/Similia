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
    <div className="mb-3">
      <span
        className="inline-block px-3 py-1 rounded-2xl text-[13px] font-medium leading-snug"
        style={{ color: colors.color, backgroundColor: colors.bg, border: `1px solid ${colors.border}` }}
      >
        {label}
      </span>
    </div>
  )
}
