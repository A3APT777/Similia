import { createClient as createSupabaseClient } from '@supabase/supabase-js'

// Сервисный клиент с service role key — обходит RLS
// Используется только в server actions для публичных операций (загрузка фото по токену)
export function createServiceClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}
