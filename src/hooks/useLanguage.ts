'use client'

import { useState, useEffect, useCallback } from 'react'

export type Lang = 'ru' | 'en'

const STORAGE_KEY = 'hc-lang'
const EVENT_NAME = 'hc-lang-change'

// Хук для управления языком интерфейса.
// Язык хранится в localStorage и синхронизируется между вкладками/компонентами
// через кастомное событие.
export function useLanguage() {
  const [lang, setLangState] = useState<Lang>('ru')

  useEffect(() => {
    // Читаем из localStorage при монтировании
    const stored = localStorage.getItem(STORAGE_KEY) as Lang | null
    if (stored === 'ru' || stored === 'en') setLangState(stored)

    // Подписываемся на смену языка другими компонентами
    function handler(e: Event) {
      setLangState((e as CustomEvent<Lang>).detail)
    }
    window.addEventListener(EVENT_NAME, handler)
    return () => window.removeEventListener(EVENT_NAME, handler)
  }, [])

  const setLang = useCallback((l: Lang) => {
    localStorage.setItem(STORAGE_KEY, l)
    document.cookie = `hc-lang=${l};path=/;max-age=31536000`
    setLangState(l)
    window.dispatchEvent(new CustomEvent<Lang>(EVENT_NAME, { detail: l }))
  }, [])

  const toggle = useCallback(() => {
    setLang(lang === 'ru' ? 'en' : 'ru')
  }, [lang, setLang])

  return { lang, setLang, toggle }
}
