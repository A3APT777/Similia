'use server'

import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

const loginSchema = z.object({
  email: z.string().email().max(200),
  password: z.string().min(1).max(200),
})

export async function loginAction(_prevState: string | null, formData: FormData): Promise<string | null> {
  const parsed = loginSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  })

  if (!parsed.success) {
    return 'invalid_input'
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  })

  if (error) {
    // Не отдаём error.message клиенту — возвращаем generic маркер
    const msg = error.message.toLowerCase()
    if (msg.includes('rate limit') || msg.includes('too many')) return 'rate_limit'
    if (msg.includes('network') || msg.includes('fetch')) return 'network'
    return 'invalid_credentials'
  }

  redirect('/dashboard')
}
