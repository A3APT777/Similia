# Similia (CaseBook) — Инструкции для проекта

Веб-сервис для гомеопатов. Ведение пациентов, консультации, реперторизация, назначения.
Production: https://simillia.ru | Стек: Next.js 16 + Supabase + TypeScript + Tailwind 4

## Защищённые файлы — спрашивать перед изменением
- `supabase/migrations/` — миграции БД необратимы
- `src/lib/actions/payments.ts`, `subscription.ts` — логика денег
- `src/lib/supabase/` — клиенты БД, сломается = ляжет весь сайт
- `.env*` — ключи и токены
- `next.config.ts` — конфигурация сборки

## Перед деплоем
Пройти `CHECKLIST.md` в корне проекта.

## Перед работой
Прочитать docs/ARCHITECTURE.md для понимания структуры.

## Деплой
- `git push origin main` → Vercel автодеплой
- НЕ через `vercel --prod` (нет токена)
- Node v25.8.1: `tsc --noEmit` отдельно, в next.config.ts стоит ignoreBuildErrors

## Особенности
- Server Actions для всех мутаций (нет REST API кроме webhooks)
- Каждый action начинается с getUser() + фильтр по doctor_id
- Публичные формы (intake, upload, followup, new) — через service client
- i18n: все UI-строки через t('key')
- 3 типа Supabase-клиентов: client (браузер), server (SSR), service (обход RLS)
