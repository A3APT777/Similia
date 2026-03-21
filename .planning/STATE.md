# State — Similia

**Последнее обновление:** 2026-03-22

---

## Завершённые milestone'ы

| Milestone | Статус | Дата |
|-----------|--------|------|
| v1.0 — MVP | ✅ Завершён | до 2026-03-17 |
| v1.1 — Onboarding (driver.js) | ✅ Завершён | 2026-03-18 |
| v1.2 — Рефакторинг редактора | ✅ Завершён | 2026-03-18 |
| v1.3 — Аудит и фиксы | ✅ Завершён | 2026-03-19 |
| v1.4 — Подписки и ЮKassa | ✅ Завершён | 2026-03-20 |
| v1.5 — Опросники и назначения | ✅ Завершён | 2026-03-20 |
| v1.6 — Реферальная система | ✅ Завершён | 2026-03-21 |
| v1.7 — Дизайн-улучшения | ✅ Завершён | 2026-03-21 |
| v1.8 — Единый онбординг | ✅ Завершён | 2026-03-22 |

---

## Что реализовано (актуально на 2026-03-22)

### Инфраструктура
- Next.js 16 + React 19 + TypeScript strict + Tailwind 4
- Supabase (PostgreSQL + Auth + Storage)
- ЮKassa интеграция (платежи, webhooks, IP-фильтр)
- Яндекс.Метрика (108156570)
- Vercel deploy (simillia.ru)
- 220 тестов (vitest)
- proxy.ts (auth, rate limiting, CSP)

### Подписки и тарифы
- Free (5 пациентов) / Стандарт (290 ₽/мес, 2900 ₽/год)
- PaywallOverlay, SubscriptionBadge, graceful downgrade
- Все до 31.05.2026 → Стандарт бесплатно
- Страница /pricing с CheckoutButton

### Реферальная система
- Код XXXX-XXXX, ссылка simillia.ru?r=CODE
- +7 дней рефереру, +14 приглашённому (при оплате)
- Лимит 180 дней, защита от self-referral
- Страница /referral со статистикой
- TourMenu в сайдбаре

### Предконсультационные опросники
- 15 вопросов (6 блоков), профессиональные гомеопатические
- Таблица pre_visit_surveys, привязка к consultation_id
- PreVisitSurveyPanel в правой панели консультации
- SendSurveyButton на карточке пациента
- Интеграция с AddPatientWidget на дашборде

### Отправка назначений
- prescription_shares, правила приёма (кофе, мята, камфора)
- SharePrescriptionButton (в консультации + на карточке)
- Страница /rx/[token] для пациента
- PrescriptionRulesEditor в настройках

### Онбординг (v1.8)
- InteractiveTour (32 шага, 6 блоков) в layout.tsx
- WelcomeScreen при первом входе
- TourMenu в сайдбаре (запуск любого блока)
- Подсветка элементов (data-tour), навигация между страницами
- Старые туры (driver.js, SiteTourPanel, Tour*) удалены

### Дизайн
- Брендовые цвета: forest #2d6a4f, parchment #f7f3ed, gold #c8a035
- Все emerald/green заменены на forest
- Hover-эффекты на всех CTA (translateY + shadow)
- Двуслойные тени, focus-visible
- Pricing: контраст на тёмной карточке исправлен

---

## Текущий milestone

**Не определён** — нужно создать новый.

---

## Известные проблемы / технический долг

| Проблема | Критичность |
|----------|-------------|
| RLS не на patients, consultations, followups, photos | 🔴 |
| Race condition в submitIntake | 🟡 |
| 3 autosave action вместо 1 | 🟡 |
| completeConsultation + decrement не атомарны | 🟡 |
| IntakeForm.tsx — 1085 строк | 🟢 |
| RepertoryClient.tsx — 1768 строк | 🟢 |
| Хардкод RU в ~15 файлах (не через i18n) | 🟢 |
| Хардкод цветов #2d6a4f (не через var(--sim-*)) | 🟢 |
| tour.ts (driver.js) — мёртвый код 567 строк | 🟢 |
| SiteTourPanel.tsx — мёртвый код | 🟢 |
| driver.js в package.json — неиспользуемый пакет | 🟢 |
