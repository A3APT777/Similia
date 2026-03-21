# Similia — Architecture

## 1. Обзор

**Similia** — SaaS-платформа для практикующих врачей-гомеопатов. Ведение пациентов, консультации, реперторизация, назначения, отслеживание динамики лечения.

| Параметр | Значение |
|----------|----------|
| URL | https://simillia.ru |
| Стек | Next.js 16.1.6 (App Router), React 19, TypeScript strict, Supabase, Tailwind 4 |
| Деплой | Vercel (автодеплой при push в main) |
| Репозиторий | https://github.com/A3APT777/homeocase.git |
| Node | v25.8.1 |

---

## 2. Структура проекта

```
src/
├── app/                              # Next.js App Router
│   ├── layout.tsx                    # Глобальный layout: шрифты, metadata, analytics, CookieConsent
│   ├── page.tsx                      # Landing page (публичная, 454 строк)
│   ├── login/                        # Вход (email/password)
│   ├── register/                     # Регистрация (+ автосоздание демо-данных)
│   ├── forgot-password/              # Восстановление пароля
│   ├── dashboard/                    # Главный экран врача
│   │   ├── page.tsx                  # Server Component: загрузка данных
│   │   ├── HeroStatCards.tsx         # Статистика (пациенты, приёмы, follow-up)
│   │   ├── AppointmentList.tsx       # Список предстоящих приёмов
│   │   ├── CalendarWidget.tsx        # Мини-календарь
│   │   ├── PatientListClient.tsx     # Список пациентов с поиском
│   │   ├── AddPatientWidget.tsx      # Быстрое добавление пациента
│   │   ├── OnboardingBanner.tsx      # Баннер для новых пользователей
│   │   ├── UnpaidWidget.tsx          # Неоплаченные сеансы
│   │   └── LunarPhaseWidget.tsx      # Фазы луны (гомеопатия)
│   ├── patients/
│   │   ├── new/page.tsx              # Создание пациента
│   │   └── [id]/
│   │       ├── page.tsx              # Карточка пациента (26KB)
│   │       ├── edit/page.tsx         # Редактирование
│   │       ├── export/               # Экспорт в PDF
│   │       ├── intake-edit/          # Редактирование анкеты
│   │       ├── StickyPatientHeader   # Фиксированная шапка
│   │       ├── PatientTimeline       # Хронология приёмов
│   │       ├── PhotoSection          # Фото пациента
│   │       ├── FollowupSection       # Опросы самочувствия
│   │       ├── PaidSessionsBlock     # Оплаченные сеансы
│   │       └── consultations/[consultationId]/
│   │           ├── page.tsx              # Загрузка консультации
│   │           ├── ConsultationEditor    # Основной редактор (центральная панель)
│   │           ├── context/ConsultationContext  # State + autosave (debounce 3 сек)
│   │           ├── MiniRepertory         # Мини-реперторий (в консультации)
│   │           ├── PrescriptionModal     # Модалка назначения
│   │           ├── TemplateMenu          # Шаблоны заметок
│   │           ├── components/           # Подкомпоненты редактора
│   │           │   ├── ComplaintsForm    # Форма жалоб
│   │           │   ├── SymptomInput      # Ввод структурированных симптомов
│   │           │   ├── CaseFormulation   # Формулировка случая
│   │           │   ├── DynamicsBlock     # Блок динамики
│   │           │   ├── EditorHeader      # Шапка редактора
│   │           │   ├── EditorToolbar     # Панель инструментов
│   │           │   └── InlineRx          # Inline-назначение
│   │           └── right-panel/          # Правая панель (контекст)
│   │               ├── RightPanel        # Контейнер
│   │               ├── ClinicalSummaryBlock  # Клинический анализ
│   │               ├── DecisionBlock     # Рекомендация по лечению
│   │               ├── CaseStateBlock    # Состояние случая
│   │               ├── ActiveRemedy      # Текущий препарат
│   │               ├── SymptomDynamics   # Динамика симптомов
│   │               ├── TopRemediesPanel  # Топ препаратов
│   │               ├── PreviousVisitSummary  # Предыдущий визит
│   │               └── PreVisitSurveyPanel   # Опросник перед визитом
│   ├── repertory/                    # Полный реперторий
│   │   ├── page.tsx                  # Server Component
│   │   ├── RepertoryClient.tsx       # Поиск + результаты (1768 строк)
│   │   └── RepertoryTutorialPanel    # Обучающий тур
│   ├── settings/                     # Настройки врача
│   ├── pricing/                      # Тарифы
│   │   ├── page.tsx                  # Страница тарифов
│   │   └── CheckoutButton.tsx        # Кнопка оплаты
│   ├── checkout/success/             # Успешный платёж
│   ├── privacy/                      # Политика конфиденциальности
│   ├── terms/                        # Условия использования
│   ├── survey/[token]/               # Предконсультационный опросник (публичный)
│   ├── intake/[token]/               # Анкета пациента (публичный)
│   ├── followup/[token]/             # Опрос самочувствия (публичный)
│   ├── upload/[token]/               # Загрузка фото (публичный)
│   ├── new/[token]/                  # Запись нового пациента (публичный)
│   └── api/
│       ├── checkout/route.ts         # POST: создание платежа в ЮKassa
│       └── yookassa-webhook/route.ts # POST: webhook от ЮKassa
├── components/
│   ├── AppShell.tsx                  # Wrapper для auth-страниц
│   ├── SidebarShell.tsx              # Навигация (sidebar)
│   ├── PatientForm.tsx               # Форма пациента (create/edit)
│   ├── PaywallOverlay.tsx            # Оверлей лимита Free плана
│   ├── SubscriptionBadge.tsx         # Бейдж подписки
│   ├── CookieConsent.tsx             # Cookie-баннер
│   ├── FeedbackModal.tsx             # Обратная связь
│   ├── ScheduleButton.tsx            # Кнопка записи на приём
│   ├── LogoutButton.tsx              # Выход
│   ├── InteractiveTour.tsx            # Единый 32-шаговый тур
│   ├── WelcomeScreen.tsx             # Приветствие при первом входе
│   ├── TourMenu.tsx                  # Меню обучения в сайдбаре
│   ├── RefCookieSetter.tsx           # Cookie для реферальной ссылки
│   ├── PublicFooter.tsx              # Футер публичных страниц
│   ├── FirstTimeHint.tsx             # Контекстные подсказки
│   └── ui/                           # shadcn/ui примитивы
└── lib/
    ├── actions/                      # Server Actions (19 файлов)
    ├── supabase/                     # Клиенты БД (3 файла)
    ├── clinicalEngine.ts             # Клинический движок (rule-based)
    ├── subscription.ts               # Логика тарифов (чистая, без побочных эффектов)
    ├── prescriptionDefaults.ts       # Правила приёма препаратов
    ├── validation.ts                 # Zod-схемы валидации
    ├── i18n.ts                       # Интернационализация (RU/EN)
    ├── i18n-server.ts                # Серверная часть i18n
    ├── remedies.ts                   # Справочник препаратов
    ├── repertory-translations.ts     # Русские переводы рубрик
    ├── slots.ts                      # Расчёт слотов времени
    ├── utils.ts                      # Утилиты (cn, formatDate, getAge)
    └── __tests__/                    # Тесты (vitest, 220 штук)
```

---

## 3. База данных

### Таблицы

| Таблица | Назначение | Ключевые поля | RLS |
|---------|------------|---------------|-----|
| `patients` | Карточки пациентов | doctor_id, name, birth_date, phone, gender, paid_sessions | ⚠️ Нет |
| `consultations` | Приёмы врача | patient_id, doctor_id, status, type, remedy, potency, repertory_data (JSONB), clinical_assessment (JSONB) | ⚠️ Нет |
| `intake_forms` | Анкеты пациентов | token (UNIQUE), doctor_id, patient_id, type (primary/acute), status, answers (JSONB), expires_at | ⚠️ Нет |
| `followups` | Опросы самочувствия | consultation_id, patient_id, token, status (better/same/worse/new_symptoms) | ⚠️ Нет |
| `pre_visit_surveys` | Предконсультационные опросники | consultation_id, patient_id, doctor_id, token, answers (JSONB), expires_at | ✅ Да |
| `patient_photos` | Фото пациентов | patient_id, doctor_id, storage_path, url | ⚠️ Нет |
| `new_patient_tokens` | Токены записи | token, doctor_id, expires_at, used | ⚠️ Нет |
| `doctor_settings` | Настройки врача | doctor_id (PK), paid_sessions_enabled, followup_reminder_days | ✅ Да |
| `payment_history` | История добавления сеансов | patient_id, doctor_id, amount, note | ✅ Да |
| `subscription_plans` | Тарифные планы | id (free/standard), price_monthly, max_patients, features (JSONB) | — |
| `subscriptions` | Подписки врачей | doctor_id (UNIQUE), plan_id, status, billing_period, yukassa_payment_method_id | ✅ Да |
| `subscription_payments` | Платежи | subscription_id, doctor_id, amount, yukassa_payment_id (UNIQUE), status | ✅ Да |
| `doctor_schedules` | Расписание | doctor_id (PK), working_days (JSONB), start_time, end_time, session_duration | — |
| `repertory_rubrics` | Рубрики реперториума | source, chapter, fullpath, fullpath_ru, remedies (JSONB), remedy_count | — |
| `homeo_remedies` | Справочник препаратов | abbrev, name_latin, name_ru | — |

### Связи

```
patients ──< consultations (patient_id)
patients ──< intake_forms (patient_id, nullable)
patients ──< patient_photos (patient_id)
patients ──< followups (patient_id)
patients ──< pre_visit_surveys (patient_id)
consultations ──< followups (consultation_id)
consultations ──< pre_visit_surveys (consultation_id, nullable)
doctor (auth.users) ──< patients (doctor_id)
doctor ──< doctor_settings (doctor_id)
doctor ──< subscriptions (doctor_id)
subscriptions ──< subscription_payments (subscription_id)
```

### Атомарные операции (SQL функции)

| Функция | Назначение |
|---------|------------|
| `delete_patient_cascade(p_id, d_id)` | Каскадное удаление пациента (7 таблиц в одной транзакции) |
| `increment_paid_sessions(p_id, d_id, amt)` | Атомарное добавление сеансов (GREATEST защита от отрицательных) |
| `decrement_paid_session(p_id, d_id)` | Атомарное списание сеанса |

---

## 4. Авторизация и доступ

### Supabase Auth
- Email/password регистрация и вход
- Сессия хранится в cookies (через @supabase/ssr)
- Подтверждение email и сброс пароля — встроенные в Supabase

### 3 типа клиентов Supabase

| Клиент | Файл | Где используется | RLS |
|--------|------|------------------|-----|
| Browser | `supabase/client.ts` | Клиентские компоненты ('use client') | ✅ Действует |
| Server | `supabase/server.ts` | Server Components, Server Actions | ✅ Действует |
| Service | `supabase/service.ts` | Публичные операции (intake, upload, followup) | ❌ Обходит |

### Паттерн авторизации в Server Actions
```typescript
'use server'
export async function someAction(id: string) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Все запросы фильтруют по doctor_id
  const { data } = await supabase
    .from('patients')
    .select('*')
    .eq('doctor_id', user.id)  // <-- обязательно
}
```

### ⚠️ Известные проблемы
- ~~middleware.ts отсутствует~~ — **Исправлено:** proxy.ts (формат Next.js 16) с auth, rate limiting, CSP
- **RLS не на всех таблицах** — patients, consultations, intake_forms, followups, patient_photos, new_patient_tokens не имеют RLS-политик

---

## 5. Server Actions

### patients.ts
| Функция | Назначение | Auth |
|---------|------------|------|
| `createPatient(formData)` | Создание пациента (проверка лимита Free плана) | ✅ |
| `updatePatient(id, formData)` | Обновление данных | ✅ |
| `deletePatient(id)` | Каскадное удаление (RPC) | ✅ |

### consultations.ts
| Функция | Назначение | Auth |
|---------|------------|------|
| `createConsultation(patientId, type)` | Создание приёма (закрывает предыдущие in_progress) | ✅ |
| `scheduleConsultation(patientId, scheduledAt, type)` | Запланировать приём | ✅ |
| `updateConsultationType(id, type)` | Изменить тип (chronic/acute) | ✅ |
| `updateConsultationNotes(id, notes)` | Обновить заметки (autosave) | ✅ |
| `updateConsultationFields(id, fields)` | Обновить поля (autosave) | ✅ |
| `updateConsultationExtra(id, extra)` | Обновить доп. поля (autosave) | ✅ |
| `addStructuredSymptoms(id, symptoms)` | Добавить структурированные симптомы | ✅ |
| `savePrescription(id, rx)` | Сохранить назначение | ✅ |
| `completeConsultation(id)` | Завершить приём (clinical_assessment через clinicalEngine) | ✅ |

### intake.ts
| Функция | Назначение | Auth |
|---------|------------|------|
| `createIntakeLink(type)` | Создать ссылку на анкету (24ч) | ✅ |
| `createIntakeLinkForPatient(patientId, type)` | Анкета для существующего пациента | ✅ |
| `submitIntake(token, answers)` | Пациент отправляет анкету | ❌ Service |
| `getIntakeByToken(token)` | Получить анкету по токену | ❌ Service |

### payments.ts
| Функция | Назначение | Auth |
|---------|------------|------|
| `getDoctorSettings()` | Настройки врача | ✅ |
| `updatePaidSessionsEnabled(enabled)` | Вкл/выкл оплаченных сеансов | ✅ |
| `updateFollowupReminderDays(days)` | Дни напоминания | ✅ |
| `addPaidSessions(patientId, amount, note)` | Добавить сеансы (атомарно) | ✅ |

### subscription.ts
| Функция | Назначение | Auth |
|---------|------------|------|
| `getSubscription()` | Получить подписку врача | ✅ |
| `checkPatientLimit()` | Проверить лимит пациентов | ✅ |
| `getAccessiblePatientIds()` | ID доступных пациентов | ✅ |

### repertory.ts
| Функция | Назначение | Auth |
|---------|------------|------|
| `searchRepertory(query, chapters, source, page)` | Поиск рубрик (с русским стеммингом) | ✅ |

---

## 6. Публичные маршруты (без авторизации)

Все публичные формы защищены **токенами с ограниченным сроком действия**.

| Маршрут | Токен | Срок | Одноразовый | Назначение |
|---------|-------|------|-------------|------------|
| `/intake/[token]` | UUID | 24 часа | Да | Анкета пациента |
| `/followup/[token]` | UUID | Без срока | Да | Опрос самочувствия |
| `/upload/[token]` | UUID | 4 часа | Нет | Загрузка фото |
| `/new/[token]` | UUID | 30 дней | Да | Запись нового пациента |
| `/survey/[token]` | UUID | 30 дней | Да | Предконсультационный опросник |

---

## 7. Клинический движок

Файл: `src/lib/clinicalEngine.ts`

**Rule-based система (без AI)** для анализа динамики симптомов.

### Входные данные
```typescript
computeAssessment(
  currentSymptoms: StructuredSymptom[],  // с полем dynamics
  previousSymptoms: StructuredSymptom[], // из прошлого визита
  previousCaseState: CaseState | null,
  followupStatus: string | null
)
```

### Определение состояния (Case State)

| Состояние | Правило |
|-----------|---------|
| `improving` | better > 0 && worse === 0 && new === 0 |
| `aggravation` | worse > 0 && resolved > 0 |
| `no_effect` | same/total > 0.7 |
| `deterioration` | worse > better && new > 0 && resolved === 0 |
| `relapse` | previousState === improving && worse > 0 |
| `unclear` | < 2 симптомов |

### Рекомендация (Decision)

| Состояние → Решение |
|---------------------|
| improving → `continue` (продолжить) |
| aggravation → `wait` (подождать) |
| no_effect → `change` (сменить препарат) |
| deterioration → `change` |
| relapse → `increase` (повысить потенцию) |
| unclear → `wait` |

---

## 8. Реперторий

### Данные
- **74 482 рубрики** из Repertorium Publicum (Kent)
- Таблица `repertory_rubrics`: fullpath, fullpath_ru, remedies (JSONB), chapter
- ~746 препаратов с грейдами 1-3

### Поиск
- `ilike` по fullpath / fullpath_ru
- Русский стемминг (головная → голов, жгучая → жгуч)
- Фильтр по главам (chapters)
- Пагинация (20 результатов)

### Два вида анализа
- **Visual** — прогресс-бары с цветовой кодировкой покрытия
- **Classic** — таблица ∑Sym (кол-во рубрик), ∑Deg (сумма степеней), Symptoms (номера рубрик)

### Мини-реперторий (в консультации)
- До 100 рубрик в clipboard
- Вес рубрики (1-3), элиминация
- Автосохранение в `consultation.repertory_data` (JSONB)
- Назначение препарата прямо из анализа (Rx кнопка)

---

## 9. Платежи (ЮKassa)

### Тарифы
| План | Цена | Лимит пациентов |
|------|------|-----------------|
| Free | 0 ₽ | 5 |
| Стандарт | 290 ₽/мес или 2 900 ₽/год | Безлимит |

Все зарегистрированные до 31.05.2026 получают Стандарт бесплатно.

### Процесс оплаты
1. Врач нажимает "Оформить подписку" → `POST /api/checkout`
2. Создаётся платёж в ЮKassa API v3
3. Врач перенаправляется на страницу оплаты ЮKassa
4. После оплаты ЮKassa отправляет webhook → `POST /api/yookassa-webhook`
5. Webhook обновляет `subscription_payments.status` и продлевает `subscriptions`

### Безопасность платежей
- IP-фильтр webhook (только адреса ЮKassa)
- Защита от replay-атак (проверка yukassa_payment_id UNIQUE)
- Защита от двойного клика (нет ли pending платежа за 5 мин)

---

## 10. Интернационализация (i18n)

- Два языка: русский (по умолчанию), английский
- Файл: `src/lib/i18n.ts` (~71KB — все строки)
- Клиент: `const { lang } = useLanguage(); t(lang).section.key`
- Сервер: `const lang = getLang(); t(lang).section.key` (из cookies)
- Все UI-строки через `t()`, не хардкод

---

## 11. Соглашения по коду

### Общие
- TypeScript strict mode
- Server Components по умолчанию, `'use client'` только где нужно состояние/события
- Server Actions для всех мутаций данных (нет REST API кроме webhooks)
- Zod для валидации входных данных на сервере
- Комментарии в коде — на русском

### Именование
- Функции и переменные: `camelCase`
- Компоненты: `PascalCase`
- Файлы компонентов: `PascalCase.tsx`
- Server Actions: `camelCase` в файлах `lowercase.ts`
- Таблицы БД: `snake_case`
- Поля БД: `snake_case`

### Структура Server Action
```typescript
'use server'

import { createServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { someSchema } from '@/lib/validation'

export async function actionName(rawInput: unknown) {
  // 1. Auth
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // 2. Валидация
  const { data: input, error } = someSchema.safeParse(rawInput)
  if (error) throw new Error('Invalid input')

  // 3. Бизнес-логика (всегда фильтр по doctor_id)
  const { error: dbError } = await supabase
    .from('table')
    .update({ field: input.value })
    .eq('id', input.id)
    .eq('doctor_id', user.id)

  if (dbError) throw new Error(dbError.message)

  // 4. Инвалидация кэша
  revalidatePath('/dashboard')
}
```

---

## 12. Деплой

### Процесс
```bash
# 1. Проверка типов (отдельно, т.к. Node OOM при tsc внутри next build)
npx tsc --noEmit

# 2. Билд
npm run build

# 3. Коммит и пуш
git add <files>
git commit -m "описание изменений"
git push origin main
# Vercel автоматически задеплоит
```

### Конфигурация Next.js (`next.config.ts`)
- `typescript.ignoreBuildErrors: true` — из-за OOM на Node v25
- Security headers: CSP, X-Frame-Options, X-Content-Type-Options, HSTS, Permissions-Policy

### Переменные окружения (.env.local)
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
YOOKASSA_SHOP_ID=
YOOKASSA_SECRET_KEY=
NEXT_PUBLIC_APP_URL=
```

---

## 13. Известные проблемы

| Проблема | Критичность | Статус |
|----------|-------------|--------|
| RLS не на всех таблицах (patients, consultations, intake_forms, followups, photos) | 🔴 Критично | Запланировано |
| Нет middleware.ts | 🔴 Критично | Запланировано |
| Race condition в submitIntake (возможны дубликаты) | 🟡 Средне | Запланировано |
| 3 autosave action вместо 1 (3x нагрузка) | 🟡 Средне | Запланировано |
| completeConsultation + decrementPaidSession не атомарны | 🟡 Средне | Запланировано |
| ~~Анкета не привязана к консультации~~ | ✅ | Исправлено — pre_visit_surveys с consultation_id |
| IntakeForm.tsx — 1085 строк (god component) | 🟢 Техдолг | Отложено |
| RepertoryClient.tsx — 1768 строк (god component) | 🟢 Техдолг | Отложено |
| ~~Нет индексов на FK~~ | ✅ | Исправлено — индексы добавлены |
