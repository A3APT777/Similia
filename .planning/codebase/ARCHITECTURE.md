# Architecture — CaseBook (Similia)

## Overall Pattern

Next.js 15 App Router с гибридной архитектурой Server Components + Server Actions.

- **Server Components** — получение данных и композиция страниц (по умолчанию)
- **Server Actions** (`'use server'`) — мутации и обработка форм
- **Client Components** — интерактивные элементы и стейт
- **Middleware** — auth, rate limiting, CSP headers на уровне запроса

---

## Data Flow

```
User Action (Browser)
    ↓
Client Component / Form
    ↓
Server Action (src/lib/actions/*)
    ↓
Supabase Client (server.ts / service.ts)
    ↓
Supabase Database (PostgreSQL + RLS)
    ↓
revalidatePath() → обновлённый UI
```

---

## Ключевые абстракции

### 1. Supabase Clients (три типа)
- `src/lib/supabase/server.ts` — сервер-клиент, читает cookies из `next/headers`
- `src/lib/supabase/client.ts` — браузер-клиент для client components
- `src/lib/supabase/service.ts` — service role, обходит RLS (для admin операций)

### 2. Middleware (`src/middleware.ts`)
- Auth редиректы (приватные маршруты → `/login`)
- Rate limiting для публичных форм (10 req / 60s per IP, в памяти процесса)
- CSP заголовки и безопасность
- Refresh сессии через Supabase SSR

### 3. Server Actions (`src/lib/actions/*`)
- Чистые серверные функции с `'use server'`
- Валидация через Zod → Supabase мутация → revalidatePath
- Пример: `createPatient()`, `scheduleConsultation()`, `updateConsultation()`

### 4. Type System (`src/types/index.ts`)
- Доменные модели: `Patient`, `Consultation`, `StructuredSymptom`, `Followup`
- Enums: `ConsultationStatus`, `CaseState`, `ClinicalDecision`, `SymptomDynamics`

### 5. Clinical Engine (`src/lib/clinicalEngine.ts`)
- Rule-based (без AI) логика принятия решений
- Вычисляет `CaseState` (improving, aggravation, deterioration и т.д.)
- Предлагает `ClinicalDecision` (continue, change, wait, antidote, refer)

### 6. Validation (`src/lib/validation.ts`)
- Zod-схемы для всех форм и server actions
- Используется до Supabase inserts

---

## Слои и взаимодействие

```
Middleware
├── Auth check & redirect
├── Rate limiting
└── CSP headers
        ↓
Pages (Server Components)
├── app/layout.tsx — root layout, providers
├── app/dashboard/page.tsx — authenticated hub
├── app/patients/[id]/page.tsx — patient detail
├── app/patients/[id]/consultations/[id]/page.tsx — editor
└── app/auth/*, login, register — public
        ↓
Components (Server + Client)
├── AppShell — layout wrapper
├── SidebarShell — navigation (client)
├── ConsultationEditor — основной редактор (client, ~50KB)
└── RepertoryClient — поиск по реперторию (client)
        ↓
Server Actions
├── patients.ts, consultations.ts, schedule.ts
├── intake.ts, followups.ts, newPatient.ts
├── photos.ts, photoUpload.ts, repertory.ts
└── payments.ts, seed.ts
        ↓
Supabase Client (Server)
└── PostgreSQL + RLS (doctor_id checks)
```

---

## Entry Points

1. **Root Layout** `src/app/layout.tsx` — шрифты (Geist, Cormorant), ToastProvider, Yandex Metrika
2. **Middleware** `src/middleware.ts` — каждый запрос
3. **Landing** `src/app/page.tsx` — публичная, ~689 строк, секции с benefits/CTA
4. **Dashboard** `src/app/dashboard/page.tsx` — hub с `Promise.all()` параллельных фетчей
5. **Patient Detail** `src/app/patients/[id]/page.tsx` — карточка + timeline
6. **Consultation Editor** `src/app/patients/[id]/consultations/[id]/page.tsx` — основной UI

---

## Auth Flow

```
Запрос → middleware.ts
    → updateSession() — refresh Supabase session via cookie
    → если нет сессии AND маршрут не в publicRoutes → redirect /login
    → если есть сессия AND маршрут /login → redirect /dashboard
```

Публичные маршруты: `/`, `/login`, `/register`, `/new/[token]`, `/intake/[token]`, `/followup/[token]`, `/upload/[token]`, `/privacy`, `/terms`
