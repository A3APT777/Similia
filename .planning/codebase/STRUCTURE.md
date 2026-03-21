# Structure — CaseBook (Similia)

## Directory Layout

```
src/
├── app/                          # Next.js 16 App Router
│   ├── layout.tsx               # Root layout: шрифты, providers, InteractiveTour, Метрика
│   ├── page.tsx                 # Landing page (public, RefCookieSetter)
│   ├── globals.css              # Global styles + Tailwind
│   ├── error.tsx                # Error boundary
│   ├── global-error.tsx         # Global error handler
│   │
│   ├── auth/callback/route.ts   # OAuth callback (Supabase)
│   ├── login/page.tsx           # Login form
│   ├── register/page.tsx        # Registration (+ ref_code из cookie)
│   ├── forgot-password/page.tsx # Password reset
│   ├── auth/reset-password/     # Сброс пароля
│   ├── privacy/page.tsx         # Политика конфиденциальности
│   ├── terms/page.tsx           # Условия использования
│   │
│   ├── dashboard/               # Authenticated hub
│   │   ├── page.tsx             # Главная панель (Promise.all)
│   │   ├── HeroStatCards.tsx    # Статистика
│   │   ├── AppointmentList.tsx  # Список приёмов
│   │   ├── CalendarWidget.tsx   # Мини-календарь
│   │   ├── PatientListClient.tsx# Список пациентов (client)
│   │   ├── AddPatientWidget.tsx # Добавление пациента (3 способа)
│   │   ├── OnboardingBanner.tsx # Чеклист для новичков
│   │   ├── UnpaidWidget.tsx     # Неоплаченные сессии
│   │   └── LunarPhaseWidget.tsx # Фазы луны
│   │
│   ├── patients/
│   │   ├── new/page.tsx         # Создать пациента
│   │   └── [id]/
│   │       ├── page.tsx         # Карточка пациента
│   │       ├── edit/page.tsx    # Редактирование
│   │       ├── export/          # Экспорт в PDF
│   │       ├── intake-edit/     # Редактирование анкеты
│   │       ├── StickyPatientHeader.tsx
│   │       ├── StartConsultationButton.tsx  # Защита от двойного клика
│   │       ├── SendSurveyButton.tsx         # Кнопка опросника
│   │       ├── IntakeLinkButton.tsx
│   │       ├── FollowupSection.tsx
│   │       ├── PhotoSection.tsx
│   │       ├── TreatmentProgress.tsx
│   │       ├── PatientTimeline.tsx
│   │       ├── TimelineWithFilter.tsx
│   │       ├── PaidSessionsBlock.tsx
│   │       ├── DeletePatientButton.tsx
│   │       ├── IntakeView.tsx
│   │       ├── CancelAppointmentButton.tsx
│   │       │
│   │       └── consultations/[consultationId]/
│   │           ├── page.tsx              # Загрузка + PreVisitSurvey
│   │           ├── ConsultationEditor.tsx # Основной редактор (client)
│   │           ├── SharePrescriptionButton.tsx  # Отправка назначения
│   │           ├── PrescriptionModal.tsx  # Модалка назначения
│   │           ├── TemplateMenu.tsx
│   │           ├── context/
│   │           │   └── ConsultationContext.tsx  # State + autosave
│   │           ├── components/
│   │           │   ├── ComplaintsForm.tsx  # Форма жалоб
│   │           │   ├── EditorHeader.tsx
│   │           │   ├── EditorToolbar.tsx   # Панель + type-toggle
│   │           │   ├── InlineRx.tsx        # Inline-назначение
│   │           │   ├── DynamicsBlock.tsx
│   │           │   ├── SymptomInput.tsx
│   │           │   └── CaseFormulation.tsx
│   │           ├── right-panel/
│   │           │   ├── RightPanel.tsx
│   │           │   ├── ActiveRemedy.tsx
│   │           │   ├── PreviousVisitSummary.tsx
│   │           │   └── PreVisitSurveyPanel.tsx  # Ответы опросника
│   │           ├── MiniRepertory.tsx
│   │           └── MiniRepertoryTutorial.tsx  # (автозапуск отключён)
│   │
│   ├── repertory/               # Полный реперторий
│   │   ├── page.tsx
│   │   ├── RepertoryClient.tsx  # Поиск + результаты
│   │   └── RepertoryTutorialPanel.tsx  # (автозапуск отключён)
│   │
│   ├── settings/                # Настройки врача
│   │   ├── page.tsx
│   │   ├── SettingsToggle.tsx
│   │   ├── FollowupReminderSetting.tsx
│   │   ├── ScheduleSettings.tsx
│   │   └── PrescriptionRulesEditor.tsx  # Правила приёма
│   │
│   ├── referral/                # Реферальная программа
│   │   ├── page.tsx
│   │   └── ReferralClient.tsx
│   │
│   ├── pricing/                 # Тарифы
│   │   ├── page.tsx
│   │   └── CheckoutButton.tsx
│   │
│   ├── checkout/success/        # Успешный платёж
│   │
│   ├── survey/[token]/          # Предконсультационный опросник (публичный)
│   │   ├── page.tsx
│   │   └── PreVisitSurveyForm.tsx
│   │
│   ├── rx/[token]/              # Назначение для пациента (публичный)
│   ├── intake/[token]/          # Анкета пациента (публичный)
│   ├── followup/[token]/        # Опрос самочувствия (публичный)
│   ├── upload/[token]/          # Загрузка фото (публичный)
│   ├── new/[token]/             # Запись нового пациента (публичный)
│   │
│   └── api/
│       ├── checkout/route.ts         # POST: создание платежа ЮKassa
│       └── yookassa-webhook/route.ts # POST: webhook от ЮKassa
│
├── components/                  # Shared компоненты
│   ├── AppShell.tsx             # Layout wrapper (server)
│   ├── SidebarShell.tsx         # Навигация (client) + TourMenu
│   ├── InteractiveTour.tsx      # Единый 32-шаговый тур
│   ├── WelcomeScreen.tsx        # Приветствие при первом входе
│   ├── OnboardingFlow.tsx       # Обёртка WelcomeScreen
│   ├── TourMenu.tsx             # Меню обучения в сайдбаре
│   ├── RefCookieSetter.tsx      # Cookie для реферальной ссылки
│   ├── PublicFooter.tsx         # Футер публичных страниц
│   ├── PatientForm.tsx          # Форма пациента (create/edit)
│   ├── ScheduleButton.tsx       # Запись на приём
│   ├── PaywallOverlay.tsx       # Оверлей лимита Free
│   ├── SubscriptionBadge.tsx    # Бейдж подписки
│   ├── CookieConsent.tsx        # Cookie-баннер
│   ├── FeedbackModal.tsx        # Обратная связь
│   ├── FirstTimeHint.tsx        # Контекстные подсказки
│   ├── LogoutButton.tsx
│   └── ui/                      # shadcn/ui примитивы
│       ├── button.tsx
│       ├── skeleton.tsx
│       └── toast.tsx
│
├── hooks/
│   └── useLanguage.ts           # Переключение языка (ru/en)
│
├── lib/
│   ├── supabase/
│   │   ├── server.ts            # Server client (cookies)
│   │   ├── client.ts            # Browser client
│   │   └── service.ts           # Service role (bypass RLS)
│   │
│   ├── actions/                 # Server Actions (19 файлов)
│   │   ├── patients.ts          # CRUD пациентов
│   │   ├── consultations.ts     # CRUD консультаций + autosave
│   │   ├── intake.ts            # Анкеты
│   │   ├── followups.ts         # Опросы самочувствия
│   │   ├── surveys.ts           # Предконсультационные опросники
│   │   ├── newPatient.ts        # Запись нового пациента
│   │   ├── photos.ts            # Фото пациентов
│   │   ├── photoUpload.ts       # Загрузка фото (публичная)
│   │   ├── repertory.ts         # Поиск рубрик
│   │   ├── remedies.ts          # Поиск препаратов
│   │   ├── payments.ts          # Настройки + оплата сеансов
│   │   ├── subscription.ts      # Подписки и лимиты
│   │   ├── schedule.ts          # Расписание врача
│   │   ├── referrals.ts         # Реферальная система
│   │   ├── prescriptionShare.ts # Отправка назначений
│   │   └── seed.ts              # Демо-данные
│   │
│   ├── clinicalEngine.ts        # Rule-based клинические решения
│   ├── subscription.ts          # Логика тарифов (чистая)
│   ├── prescriptionDefaults.ts  # Правила приёма препаратов
│   ├── validation.ts            # Zod-схемы
│   ├── remedies.ts              # In-memory база препаратов
│   ├── repertory-translations.ts # Русские переводы рубрик
│   ├── slots.ts                 # Расчёт слотов записи
│   ├── i18n.ts                  # Переводы UI (ru/en)
│   ├── i18n-server.ts           # Серверное определение языка
│   ├── utils.ts                 # cn(), formatDate(), getAge()
│   └── __tests__/               # Тесты (vitest, 220 штук)
│       ├── clinicalEngine.test.ts
│       ├── clinicalEdgeCases.test.ts
│       ├── validation.test.ts
│       ├── validationEdgeCases.test.ts
│       ├── subscription.test.ts
│       ├── utils.test.ts
│       ├── i18n.test.ts
│       └── prescriptionDefaults.test.ts
│
├── types/
│   └── index.ts                 # Доменные типы
│
├── styles/
│   └── theme.css                # CSS-токены (--sim-*)
│
└── proxy.ts                     # Auth + rate limiting + CSP (Next.js 16 middleware)
```

---

## Публичные маршруты

| Маршрут | Назначение |
|---------|-----------|
| `/` | Landing page |
| `/login`, `/register`, `/forgot-password` | Авторизация |
| `/privacy`, `/terms` | Юридические |
| `/pricing` | Тарифы |
| `/checkout/success` | Успешная оплата |
| `/intake/[token]` | Анкета пациента |
| `/followup/[token]` | Опрос самочувствия |
| `/upload/[token]` | Загрузка фото |
| `/survey/[token]` | Предконсультационный опросник |
| `/rx/[token]` | Назначение для пациента |
| `/new/[token]` | Запись нового пациента |
| `/api/yookassa-webhook` | Webhook ЮKassa |

## Приватные маршруты

| Маршрут | Назначение |
|---------|-----------|
| `/dashboard` | Главная |
| `/patients/new` | Создать пациента |
| `/patients/[id]` | Карточка |
| `/patients/[id]/edit` | Редактировать |
| `/patients/[id]/export` | PDF |
| `/patients/[id]/consultations/[id]` | Консультация |
| `/repertory` | Реперторий |
| `/settings` | Настройки |
| `/referral` | Реферальная программа |
