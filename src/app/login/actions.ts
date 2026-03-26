'use server'

import { z } from 'zod'
import { signIn } from 'next-auth/react'

const loginSchema = z.object({
  email: z.string().email().max(200),
  password: z.string().min(1).max(200),
})

// Примечание: loginAction теперь НЕ вызывается как server action.
// Логин происходит на клиенте через signIn('credentials') из next-auth/react.
// Этот файл сохранён для обратной совместимости и валидации.
export async function loginAction(_prevState: string | null, formData: FormData): Promise<string | null> {
  const parsed = loginSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  })

  if (!parsed.success) {
    return 'invalid_input'
  }

  // На сервере NextAuth signIn недоступен — авторизация идёт на клиенте.
  // Этот action оставлен как fallback-валидатор.
  return null
}
