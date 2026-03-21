# Architecture — CaseBook (Similia)

## Overall Pattern

Next.js 16 App Router с гибридной архитектурой Server Components + Server Actions.

- **Server Components** — получение данных и композиция страниц (по умолчанию)
- **Server Actions** (`'use server'`) — мутации и обработка форм
- **Client Components** — интерактивные элементы и стейт
- **Proxy (Middleware)** (`src/proxy.ts`) — auth, rate limiting, CSP headers
- **API Routes** — только для webhooks (`/api/checkout`, `/api/yookassa-webhook`)

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

Платежи: отдельный flow через API Routes:
```
Врач → POST /api/checkout → ЮKassa API → redirect на оплату
ЮKassa → POST /api/yookassa-webhook → обновление subscriptions
```

---

## Ключевые абстракции

### 1. Supabase Clients (три типа)
- `src/lib/supabase/server.ts` — сервер-клиент, читает cookies из `next/headers`
- `src/lib/supabase/client.ts` — браузер-клиент для client components
- `src/lib/supabase/service.ts` — service role, обходит RLS (для публичных форм и webhooks)

### 2. Proxy (`src/proxy.ts`, формат middleware Next.js 16)
- Auth редиректы (приватные маршруты → `/login`)
- API-маршруты → JSON 401 (не редирект)
- Rate limiting для публичных форм (10 req / 60s per IP, в памяти процесса)
- CSP заголовки и безопасность

### 3. Server Actions (`src/lib/actions/*`, 19 файлов)
- Чистые серверные функции с `'use server'`
- Паттерн: auth → Zod-валидация → Supabase мутация → revalidatePath
- Все запросы фильтруют по `doctor_id` (изоляция данных)

### 4. Type System (`src/types/index.ts`)
- Доменные модели: `Patient`, `Consultation`, `StructuredSymptom`, `Followup`, `PreVisitSurvey`
- Enums: `ConsultationStatus`, `CaseState`, `ClinicalDecision`, `SymptomDynamics`
- Подписки: `SubscriptionInfo`, `PlanId`, `PlanFeatures`

### 5. Clinical Engine (`src/lib/clinicalEngine.ts`)
- Rule-based (без AI) логика принятия решений
- Вычисляет `CaseState` (improving, aggravation, deterioration и т.д.)
- Предлагает `ClinicalDecision` (continue, change, wait, increase)

### 6. Subscription System (`src/lib/subscription.ts`)
- Чистая логика без побочных эффектов
- `isFeatureAllowed()`, `canAddPatient()`, `isPatientAccessible()`
- Graceful downgrade: при истечении подписки доступны последние 5 пациентов

### 7. Validation (`src/lib/validation.ts`)
- Zod-схемы для всех форм и server actions
- Утилита `validate()` — возвращает data или error string

---

## Слои и взаимодействие

```
Proxy (src/proxy.ts)
├── Auth check & redirect (API → JSON 401)
├── Rate limiting (публичные формы)
└── CSP headers
        ↓
Pages (Server Components)
├── app/layout.tsx — root layout, providers, InteractiveTour
├── app/dashboard/page.tsx — authenticated hub
├── app/patients/[id]/page.tsx — карточка пациента
├── app/patients/[id]/consultations/[id]/page.tsx — редактор
├── app/referral/page.tsx — реферальная программа
├── app/pricing/page.tsx — тарифы
└── app/auth/*, login, register — public
        ↓
Components (Server + Client)
├── AppShell — layout wrapper
├── SidebarShell — navigation (client) + TourMenu
├── InteractiveTour — 32-шаговый тур (в layout.tsx)
├── WelcomeScreen — приветствие при первом входе
├── ConsultationEditor — основной редактор (client)
└── RepertoryClient — поиск по реперторию (client)
        ↓
Server Actions (19 файлов)
├── patients.ts, consultations.ts, schedule.ts
├── intake.ts, followups.ts, newPatient.ts, surveys.ts
├── photos.ts, photoUpload.ts, repertory.ts, remedies.ts
├── payments.ts, subscription.ts
├── referrals.ts, prescriptionShare.ts
└── seed.ts
        ↓
API Routes (webhooks)
├── api/checkout/route.ts — создание платежа ЮKassa
└── api/yookassa-webhook/route.ts — обработка оплаты
        ↓
Supabase Client (Server/Service)
└── PostgreSQL + RLS (doctor_id checks)
```

---

## Entry Points

1. **Root Layout** `src/app/layout.tsx` — шрифты (Geist, Cormorant), ToastProvider, InteractiveTour, CookieConsent, Яндекс.Метрика
2. **Proxy** `src/proxy.ts` — каждый запрос (auth, rate limiting, CSP)
3. **Landing** `src/app/page.tsx` — публичная, RefCookieSetter для реферальных ссылок
4. **Dashboard** `src/app/dashboard/page.tsx` — hub с `Promise.all()` параллельных фетчей, WelcomeScreen
5. **Patient Detail** `src/app/patients/[id]/page.tsx` — карточка + лечение + actions
6. **Consultation Editor** `src/app/patients/[id]/consultations/[id]/page.tsx` — основной UI

---

## Auth Flow

```
Запрос → proxy.ts
    → обновление сессии через Supabase SSR cookies
    → если /api/* без сессии → JSON { error: 401 }
    → если страница без сессии AND не public → redirect /login
    → если есть сессия AND /login → redirect /dashboard
```

Публичные маршруты: `/`, `/login`, `/register`, `/forgot-password`, `/auth`, `/intake/*`, `/followup/*`, `/upload/*`, `/survey/*`, `/rx/*`, `/new/*`, `/privacy`, `/terms`, `/pricing`, `/checkout`, `/api/yookassa-webhook`, `/opengraph-image`

---

## Онбординг

```
Первый вход → WelcomeScreen
    ↓ «Начать знакомство»
InteractiveTour (32 шага, 6 блоков)
    ↓ навигация между страницами
    ↓ подсветка элементов (data-tour="xxx")
    ↓ ожидание кликов пользователя
Завершение → localStorage site_tour_done
```

Блоки тура:
- 🏠 Знакомство (шаги 0-2): дашборд, навигация
- 👤 Пациент (3-7): карточка, анкеты, действия
- 🩺 Консультация (8-16): жалобы, реперторий, назначение
- 💊 После приёма (17-20): завершение, опросник
- 📖 Реперторий (21-24): поиск, грейды, анализ
- ⚙️ Настройки (25-31): расписание, рефералы, тарифы

Повторный запуск: сайдбар → кнопка «Обучение» → выбор блока

---

## Платежи (ЮKassa)

```
1. Врач → /pricing → «Оплатить 290 ₽/мес»
2. POST /api/checkout → ЮKassa API v3 → confirmation_url
3. Врач оплачивает на странице ЮKassa
4. ЮKassa → POST /api/yookassa-webhook → payment.succeeded
5. Webhook обновляет subscriptions + начисляет реферальный бонус
6. Врач → /checkout/success
```

Защита:
- IP-фильтр webhook (только адреса ЮKassa)
- Replay-защита (проверка yukassa_payment_id UNIQUE)
- Двойной клик (pending платёж за 5 мин)
- Advisory lock для реферальных бонусов

---

## Реферальная система

```
Врач A → /referral → копирует ссылку simillia.ru?r=XXXX-XXXX
    ↓
Врач B → лендинг → cookie ref_code → регистрация → metadata
    ↓
Врач B оплачивает → webhook → apply_referral_bonus()
    ↓
Врач A: +7 дней Стандарта (макс 180)
Врач B: +14 дней Стандарта
```

SQL-функция `apply_referral_bonus()` (SECURITY DEFINER):
- Проверка self-referral
- Advisory lock (защита от параллельных webhook)
- UPSERT в subscriptions (создаёт запись если нет)
- Лимит 180 дней для реферера
