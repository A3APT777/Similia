'use client'

import { useEffect, useState } from 'react'
import { t } from '@/lib/i18n'
import { useLanguage } from '@/hooks/useLanguage'

function getMskTime() {
  return new Date().toLocaleTimeString('ru-RU', {
    timeZone: 'Europe/Moscow', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  })
}

function getMskDate() {
  return new Date().toLocaleDateString('ru-RU', {
    timeZone: 'Europe/Moscow', weekday: 'long', day: 'numeric', month: 'long',
  })
}

export default function MoscowClock() {
  const [time, setTime] = useState(getMskTime)
  const [date, setDate] = useState(getMskDate)
  const { lang } = useLanguage()

  useEffect(() => {
    const t = setInterval(() => { setTime(getMskTime()); setDate(getMskDate()) }, 1000)
    return () => clearInterval(t)
  }, [])

  return (
    <div className="bg-white border border-gray-100 rounded-2xl px-5 py-4 mb-3 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
      <div className="flex items-center justify-between mb-1">
        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-[0.08em]">{t(lang).clock.moscow}</p>
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[10px] text-gray-400">{t(lang).clock.msk}</span>
        </div>
      </div>
      <p className="text-[26px] font-light tabular-nums text-gray-900 tracking-tight leading-none">
        {time}
      </p>
      <p className="text-[11px] text-gray-400 mt-2 capitalize">{date}</p>
    </div>
  )
}
