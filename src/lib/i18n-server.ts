// Серверная часть i18n — определение языка из cookie.
// Используется ТОЛЬКО в серверных компонентах.
// import { getLang } from '@/lib/i18n-server'

import type { Lang } from '@/hooks/useLanguage'
import { cookies } from 'next/headers'

export async function getLang(): Promise<Lang> {
  try {
    const c = await cookies()
    const v = c.get('hc-lang')?.value
    return v === 'en' ? 'en' : 'ru'
  } catch {
    return 'ru'
  }
}
