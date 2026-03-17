# Integrations — CaseBook (Similia)

## Database — Supabase (PostgreSQL)

**Пакеты:** `@supabase/supabase-js`, `@supabase/ssr`

Три клиента с разными привилегиями:

| Клиент | Файл | Ключ | Использование |
|--------|------|------|---------------|
| Server | `src/lib/supabase/server.ts` | ANON_KEY | Server Components, Server Actions |
| Browser | `src/lib/supabase/client.ts` | ANON_KEY | Client Components |
| Service | `src/lib/supabase/service.ts` | SERVICE_ROLE | Обход RLS (токены, фото) |

**Таблицы:**
- `patients` — данные пациентов (RLS: `doctor_id = auth.uid()`)
- `consultations` — консультации с симптомами, назначениями
- `followups` — форма обратной связи после приёма
- `intake_forms` — анкеты для первичных пациентов
- `appointments` — записи на приём
- `doctor_settings` — настройки расписания врача
- `intake_tokens` / `followup_tokens` / `photo_tokens` / `new_patient_tokens` — одноразовые токены

**Индексы:**
- Trigram-индексы (`gin_trgm_ops`) для ILIKE-поиска по реперторию: `fullpath`, `remedy`

---

## Auth — Supabase Auth

- Email/password аутентификация
- Сессии через cookies (`@supabase/ssr`)
- Refresh сессии в middleware при каждом запросе
- Route protection: middleware проверяет наличие сессии

---

## Storage — Supabase Storage

- Загрузка фото пациентов через публичный токен
- Файл: `src/lib/actions/photoUpload.ts`
- Используется service client (bypass RLS)
- Bucket: `patient-photos`
- Форматы: JPEG, PNG, WebP, HEIC
- Путь: `{doctor_id}/{patient_id}/{timestamp}.{ext}`
- Максимальный размер: 10MB (хардкод в `photos.ts`)

---

## Deployment — Vercel

- Next.js-оптимизированный деплой
- Production URL: `homeocase.vercel.app`
- Environment variables настраиваются через Vercel Dashboard
- Edge/serverless функции для Server Actions

---

## Analytics — Yandex Metrika

- Опциональный: подключается если задан `NEXT_PUBLIC_METRIKA_ID`
- Инициализируется в `src/app/layout.tsx`

---

## Кэширование

- Поиск по реперторию: `unstable_cache` (Next.js) с TTL 24ч через service client
- Статичные данные репертория не меняются → безопасно кэшировать

---

## Внешних API нет

Приложение не интегрировано с внешними AI API, платёжными системами или сторонними сервисами. Вся бизнес-логика (клинический движок, реперторий) работает локально.

---

## Публичные endpoints (без auth)

| Маршрут | Токен | Назначение |
|---------|-------|-----------|
| `/intake/[token]` | `intake_tokens` | Анкета нового пациента |
| `/followup/[token]` | `followup_tokens` | Форма после приёма |
| `/upload/[token]` | `photo_tokens` | Загрузка фото |
| `/new/[token]` | `new_patient_tokens` | Быстрая регистрация |

Токены: срок жизни 30 дней (intake/new) или 7 дней (followup/upload), хранятся в БД.
