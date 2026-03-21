'use client'

import { useTransition } from 'react'

type Props = {
  action: () => Promise<void>
  label: string
}

export default function StartConsultationButton({ action, label }: Props) {
  const [isPending, startTransition] = useTransition()

  return (
    <button
      data-tour="new-consultation"
      type="button"
      disabled={isPending}
      onClick={() => startTransition(() => action())}
      className="btn btn-primary btn-lg w-full disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {isPending ? 'Создаём...' : label}
      {!isPending && (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
        </svg>
      )}
    </button>
  )
}
