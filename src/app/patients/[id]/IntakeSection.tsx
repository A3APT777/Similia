'use client'

import { useRef } from 'react'
import { markIntakeViewed } from '@/lib/actions/intake'

// Обёртка для секции анкет — помечает как просмотренные при раскрытии
export default function IntakeSection({
  children,
  unviewedIntakeIds,
}: {
  children: React.ReactNode
  unviewedIntakeIds: string[]
}) {
  const markedRef = useRef(false)

  function handleToggle(e: React.SyntheticEvent<HTMLDetailsElement>) {
    if ((e.target as HTMLDetailsElement).open && !markedRef.current && unviewedIntakeIds.length > 0) {
      markedRef.current = true
      // Помечаем все непросмотренные как просмотренные
      unviewedIntakeIds.forEach(id => markIntakeViewed(id).catch(() => null))
    }
  }

  return (
    <details className="group" onToggle={handleToggle}>
      {children}
    </details>
  )
}
