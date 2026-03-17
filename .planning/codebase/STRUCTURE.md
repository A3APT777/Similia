# Structure — CaseBook (Similia)

## Directory Layout

```
src/
├── app/                          # Next.js App Router pages
│   ├── layout.tsx               # Root layout — шрифты, providers
│   ├── page.tsx                 # Landing page (public, ~689 строк)
│   ├── globals.css              # Global styles + Tailwind
│   ├── error.tsx                # Error boundary
│   ├── global-error.tsx         # Global error handler
│   │
│   ├── auth/callback/route.ts   # OAuth callback (Supabase)
│   ├── login/page.tsx           # Login form (public)
│   ├── register/page.tsx        # Registration (public)
│   ├── forgot-password/page.tsx # Password reset (public)
│   ├── privacy/page.tsx         # Политика конфиденциальности
│   ├── terms/page.tsx           # Условия использования
│   │
│   ├── dashboard/               # Authenticated hub
│   │   ├── page.tsx             # Главная панель
│   │   ├── AppointmentList.tsx  # Виджет приёмов
│   │   ├── PatientListClient.tsx# Список пациентов (client)
│   │   ├── CalendarWidget.tsx   # Календарь
│   │   ├── UnpaidWidget.tsx     # Неоплаченные сессии
│   │   ├── WelcomeModal.tsx     # Первый вход
│   │   ├── OnboardingBanner.tsx # Баннер настройки
│   │   └── loading.tsx          # Loading skeleton
│   │
│   ├── patients/
│   │   ├── new/page.tsx         # Создать пациента
│   │   └── [id]/
│   │       ├── page.tsx         # Карточка пациента + timeline
│   │       ├── IntakeView.tsx
│   │       ├── PhotoSection.tsx
│   │       ├── FollowupSection.tsx
│   │       ├── TreatmentProgress.tsx
│   │       ├── PatientTimeline.tsx
│   │       ├── TimelineWithFilter.tsx
│   │       ├── edit/page.tsx    # Редактировать данные
│   │       │
│   │       ├── consultations/[consultationId]/
│   │       │   ├── page.tsx      # Шелл редактора (server)
│   │       │   ├── ConsultationEditor.tsx # Главный редактор (client)
│   │       │   ├── context/
│   │       │   │   └── ConsultationContext.tsx # State + autosave
│   │       │   ├── components/
│   │       │   │   ├── EditorHeader.tsx
│   │       │   │   ├── EditorToolbar.tsx
│   │       │   │   ├── SymptomInput.tsx
│   │       │   │   ├── CaseFormulation.tsx
│   │       │   │   ├── InlineRx.tsx
│   │       │   │   └── MiniRepertory.tsx
│   │       │   ├── right-panel/
│   │       │   │   ├── RightPanel.tsx
│   │       │   │   ├── ActiveRemedy.tsx
│   │       │   │   ├── PreviousVisitSummary.tsx
│   │       │   │   ├── SymptomDynamics.tsx
│   │       │   │   ├── CaseStateBlock.tsx
│   │       │   │   ├── ClinicalSummaryBlock.tsx
│   │       │   │   └── DecisionBlock.tsx
│   │       │   ├── TemplateMenu.tsx
│   │       │   └── PrescriptionModal.tsx
│   │       │
│   │       └── export/           # PDF экспорт
│   │           ├── page.tsx
│   │           ├── layout.tsx
│   │           └── PrintTrigger.tsx
│   │
│   ├── intake/[token]/          # Анкета пациента (публичная)
│   ├── followup/[token]/        # Форма после приёма (публичная)
│   ├── upload/[token]/          # Загрузка фото (публичная)
│   ├── new/[token]/             # Быстрая запись пациента (публичная)
│   ├── repertory/               # Поиск по реперторию
│   └── settings/                # Настройки врача
│
├── components/                  # Shared компоненты
│   ├── AppShell.tsx            # Layout wrapper (server)
│   ├── SidebarShell.tsx        # Навигация (client)
│   ├── LogoutButton.tsx
│   ├── MoscowClock.tsx         # Часы московского времени
│   ├── ScheduleButton.tsx      # Запись на приём
│   ├── PatientForm.tsx         # Форма пациента
│   ├── TourModal.tsx           # Обучающий тур
│   ├── auth/AuthLayout.tsx
│   └── ui/                     # Примитивы
│       ├── button.tsx
│       ├── skeleton.tsx
│       └── toast.tsx
│
├── hooks/
│   └── useLanguage.ts          # Переключение языка (ru/en)
│
├── lib/
│   ├── supabase/
│   │   ├── server.ts           # Server client (cookies)
│   │   ├── client.ts           # Browser client
│   │   └── service.ts          # Service role client (bypass RLS)
│   │
│   ├── actions/                # Server Actions (все мутации)
│   │   ├── patients.ts
│   │   ├── consultations.ts
│   │   ├── intake.ts
│   │   ├── followups.ts
│   │   ├── newPatient.ts
│   │   ├── photos.ts
│   │   ├── photoUpload.ts
│   │   ├── remedies.ts
│   │   ├── repertory.ts
│   │   ├── payments.ts
│   │   ├── schedule.ts
│   │   └── seed.ts
│   │
│   ├── clinicalEngine.ts       # Rule-based клинические решения
│   ├── compareConsultations.ts # Diff между консультациями
│   ├── remedies.ts             # In-memory база препаратов
│   ├── repertory-synonyms.ts   # Синонимы для поиска
│   ├── repertory-translations.ts # Переводы рубрик (3215 строк)
│   ├── slots.ts                # Расчёт слотов записи
│   ├── i18n.ts                 # Переводы UI (1259 строк)
│   ├── i18n-server.ts          # Серверное определение языка
│   ├── tour.ts                 # Шаги обучающего тура
│   ├── utils.ts                # cn(), formatDate(), getAge(), pluralize()
│   └── validation.ts           # Zod-схемы
│
├── types/
│   └── index.ts                # Доменные типы
│
├── styles/
│   └── theme.css               # CSS переменные (--sim-green и т.д.)
│
└── middleware.ts               # Auth + rate limiting
```

---

## Ключевые файлы

| Файл | Назначение |
|------|-----------|
| `src/middleware.ts` | Auth редиректы, rate limiting, CSP |
| `src/app/layout.tsx` | Корневой layout, шрифты, ToastProvider |
| `src/app/page.tsx` | Landing page (~689 строк) |
| `src/app/dashboard/page.tsx` | Authenticated hub |
| `src/app/patients/[id]/page.tsx` | Карточка пациента |
| `src/app/patients/[id]/consultations/[id]/page.tsx` | Редактор консультации |
| `src/lib/supabase/server.ts` | Server-side Supabase client |
| `src/lib/actions/consultations.ts` | Мутации консультаций |
| `src/lib/clinicalEngine.ts` | Клиническая логика |
| `src/types/index.ts` | Все доменные типы |
| `src/lib/i18n.ts` | Переводы UI (ru/en) |
| `src/lib/validation.ts` | Zod схемы валидации |

---

## Именование файлов

- **Страницы:** `page.tsx`, `layout.tsx`, `loading.tsx`, `error.tsx` (Next.js конвенции)
- **Компоненты:** PascalCase (`ConsultationEditor.tsx`, `PatientForm.tsx`)
- **Server Actions:** camelCase в `lib/actions/*.ts`
- **Утилиты:** camelCase (`clinicalEngine.ts`, `utils.ts`)
- **Типы:** `index.ts` в папке `types/`

## Маршруты App Router

**Приватные (требуют auth):**
- `/dashboard` — главная
- `/patients/new` — создать пациента
- `/patients/[id]` — карточка
- `/patients/[id]/consultations/[consultationId]` — редактор
- `/patients/[id]/edit` — редактировать
- `/patients/[id]/export` — PDF
- `/repertory` — реперторий
- `/settings` — настройки

**Публичные:**
- `/` — landing
- `/login`, `/register`, `/forgot-password`
- `/intake/[token]` — анкета
- `/followup/[token]` — форма после приёма
- `/upload/[token]` — загрузка фото
- `/new/[token]` — быстрая запись
- `/privacy`, `/terms`
