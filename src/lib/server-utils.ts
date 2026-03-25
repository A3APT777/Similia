import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { randomUUID } from 'crypto'

/**
 * Проверяет авторизацию и возвращает user.
 * Если не авторизован — редирект на /login.
 */
export async function requireAuth() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  return { supabase, user }
}

/**
 * Проверяет ошибку Supabase и выбрасывает с контекстом.
 */
export function throwIfError(error: { message: string } | null, context: string): void {
  if (error) {
    console.error(`[${context}] supabase error:`, error)
    throw new Error(error.message)
  }
}

/**
 * Генерирует токен без дефисов (32 hex символа).
 */
export function generateToken(): string {
  return randomUUID().replace(/-/g, '')
}
