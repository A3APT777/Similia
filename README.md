# Similia — CaseBook

Цифровой кабинет для врачей-гомеопатов. Ведение картотеки пациентов, консультации, реперторизация, онлайн-запись, follow-up.

**Продакшн:** https://simillia.ru

## Стек

- Next.js 16 (App Router, Turbopack)
- React 19, TypeScript strict
- Supabase (PostgreSQL + Auth + Storage + RLS)
- Tailwind CSS 4
- Деплой: Vercel

## Быстрый старт

```bash
# 1. Установить зависимости
npm install

# 2. Настроить переменные окружения
cp .env.example .env.local
# Заполнить ключи Supabase (см. .env.example)

# 3. Запустить dev-сервер
npm run dev
```

Открыть http://localhost:3000

## Скрипты

| Команда | Описание |
|---------|----------|
| `npm run dev` | Dev-сервер (Turbopack) |
| `npm run build` | Production build |
| `npm run start` | Запуск production |
| `npm run lint` | ESLint |
| `npm test` | Vitest тесты |
| `npm run check` | TypeScript + тесты + build |

## Структура

```
src/
  app/           # Страницы (App Router)
  components/    # React-компоненты
  lib/
    actions/     # Server Actions (Supabase)
    supabase/    # Клиенты Supabase
    i18n.ts      # Локализация (ru/en)
    validation.ts # Zod-схемы
  styles/        # CSS (theme.css)
  types/         # TypeScript типы
supabase/
  migrations/    # SQL-миграции
```
