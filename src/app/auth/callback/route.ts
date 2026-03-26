import { NextResponse } from 'next/server'

// NextAuth не использует callback-роут в таком формате.
// Supabase exchangeCodeForSession убран — просто редирект на дашборд или логин.
export async function GET(request: Request) {
  const { origin } = new URL(request.url)
  // Все auth-колбеки обрабатываются NextAuth через /api/auth/*
  return NextResponse.redirect(`${origin}/dashboard`)
}
