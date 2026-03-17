# Stack — CaseBook (Similia)

## Runtime & Language
- Node.js (latest LTS)
- TypeScript 5 — `strict: true`

## Framework
- **Next.js 16.1.6** (App Router)
- **React 19.2.3**

## Styling
- **Tailwind CSS 4** + PostCSS (`@tailwindcss/postcss`)
- CSS custom properties в `src/styles/theme.css` (токены: `--sim-green`, `--sim-rose` и т.д.)
- **shadcn/ui** компоненты (на Radix primitives / Base UI)
- **class-variance-authority (CVA)** 0.7.1 — варианты Button
- **clsx** + **tailwind-merge** — утилиты для классов (`cn()`)
- **tw-animate-css** — анимации

## Database
- **Supabase** (PostgreSQL)
- `@supabase/supabase-js` 2.99.1
- `@supabase/ssr` 0.9.0 — SSR-aware клиент с cookie support
- Row Level Security (RLS) включён на всех таблицах

## Icons
- **lucide-react** 0.577.0

## UI Components
- **@base-ui/react** 1.3.0 — headless primitives
- **driver.js** 1.4.0 — онбординг тур

## Основные зависимости (prod)

| Пакет | Версия | Назначение |
|-------|--------|-----------|
| next | 16.1.6 | Framework |
| react | 19.2.3 | UI |
| @supabase/ssr | 0.9.0 | Auth + DB client |
| @supabase/supabase-js | 2.99.1 | Supabase SDK |
| class-variance-authority | 0.7.1 | Component variants |
| lucide-react | 0.577.0 | Icons |
| driver.js | 1.4.0 | Onboarding tour |
| tailwind-merge | 3.5.0 | Class merging |

## Dev зависимости
- TypeScript 5
- ESLint 9 + eslint-config-next
- Tailwind CSS 4 dev tools

## Configuration
- `tsconfig.json` — `strict: true`, path alias `@/*` → `src/*`
- `next.config.ts` — стандартная конфигурация Next.js
- **Environment variables:**
  - `NEXT_PUBLIC_SUPABASE_URL` — URL Supabase проекта
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY` — публичный ключ
  - `SUPABASE_SERVICE_ROLE_KEY` — service role (только сервер)
  - `NEXT_PUBLIC_METRIKA_ID` — Yandex Metrika (опционально)

## Нет в стеке
- Нет ORM (прямые Supabase JS запросы)
- Нет Redux / Zustand (Context + useReducer)
- Нет react-query / SWR (Server Actions + revalidatePath)
- Нет тестового фреймворка (vitest/jest/playwright)
- Нет Zod в package.json (валидация через ручные проверки)
