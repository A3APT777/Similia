import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { randomUUID } from 'crypto'

/**
 * Проверяет авторизацию и возвращает userId.
 * Если не авторизован — редирект на /login.
 */
export async function requireAuth() {
  'use server'
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) redirect('/login')
  return { userId: session.user.id, user: session.user }
}

/**
 * Генерирует токен без дефисов (32 hex символа).
 */
export function generateToken(): string {
  return randomUUID().replace(/-/g, '')
}
