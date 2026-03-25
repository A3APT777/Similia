# Similia — Карта логики всех элементов сайта

Этот файл описывает ЧТО делает каждый элемент, КАКИЕ данные использует, и КАК связан с другими.
Перед изменением компонента — проверить этот файл. После изменения — обновить.

---

## ЭТАП 1: Сайдбар (SidebarShell.tsx) ✅ ПЕРЕРАБОТАН

### Пропсы:
- `firstName` — имя врача (из user_metadata)
- `initials` — первые буквы имени
- `subscription` — объект подписки (planId, status, periodEnd, bonusDays)
- `patientCount` — общее количество пациентов (включая демо)
- `realPatientCount` — только реальные (без демо)
- `isAdmin` — есть ли запись в admin_users
- `children` — контент страницы

### Логика Progressive Disclosure:
- patientCount >= 1 → показать Реперторий
- patientCount >= 3 → показать AI-анализ
- patientCount >= 5 → показать Рефералы
- isAdmin → показать Админ-панель

### Элементы:
1. **Логотип** — SVG + "Similia" (Cormorant Garamond), ведёт на /dashboard
2. **Навигация (Рабочий стол):**
   - Главная (/dashboard) — всегда
   - Реперторий (/repertory) — patientCount >= 1
   - AI-анализ (/ai-consultation) — patientCount >= 3
3. **Навигация (Пациенты):**
   - Новый пациент (/patients/new) — всегда
4. **Цитата** — декоративная, "Similia similibus curantur"
5. **Обратная связь** — открывает FeedbackModal
6. **Настройки** (/settings) — всегда
7. **Рефералы** (/referral) — patientCount >= 5
8. **Админ-панель** (/admin) — isAdmin
9. **Обучение** (TourMenu) — dropdown с блоками тура
10. **Оферта/Конфиденциальность** — ссылки
11. **Языковой переключатель** — РУ | EN
12. **SubscriptionBadge** — тариф + дата
13. **User area** — initials + firstName + LogoutButton

### Mobile:
- Drawer (слева, z-40)
- Overlay (bg-black/60)
- Burger button в mobile header
- Закрывается при клике на ссылку или overlay

### Зависимости:
- FeedbackModal — popup обратной связи
- TourMenu — меню обучения
- SubscriptionBadge — бейдж подписки
- LogoutButton — кнопка выхода
- useLanguage — хук языка
- usePathname — определяет active link

---

## ЭТАП 2: Dashboard (dashboard/page.tsx)

### Данные (server-side):
- user (auth) — имя, id
- patients — список всех пациентов врача
- consultations — последние консультации
- appointments — запланированные приёмы
- subscription — тариф
- followups — ответы на опросы
- realPatientIds — Set ID реальных (не демо)

### Progressive Disclosure:
- totalPatients < 3 → скрыть HeroStatCards, AI-блок, правую колонку
- realPatientIds.size === 0 → показать OnboardingFlow (WelcomeScreen)
- totalPatients >= 3 → показать всё

### Элементы:
1. **Hero-баннер** — приветствие + HeroStatCards (приёмы/пациенты/назначения)
2. **AI-блок** — ссылка на /ai-consultation (forest-green карточка)
3. **Active consultation** — если есть in_progress
4. **OnboardingFlow** — для новичков (WelcomeScreen)
5. **AddPatientWidget** — dropdown с 3 вариантами
6. **PatientListClient** — список с поиском, фильтрами
7. **Правая колонка:**
   - LunarPhaseWidget
   - CalendarWidget (с записями)
   - Аналитика 90 дней

### Первый вход (0 пациентов):
- seed демо-пациентов
- redirect на /patients/[demo-id]?welcome=1

---

## ЭТАП 3: Карточка пациента (patients/[id]/page.tsx)

### Данные:
- patient — имя, возраст, телефон, конституция, gender, is_demo
- consultations — все консультации пациента
- intakeForms — анкеты (primary, acute)
- followups — опросы по консультациям
- photos — фотографии
- subscription — для проверки доступа

### Режим welcome=1:
- Баннер "Добро пожаловать" ПЕРВЫМ
- Кнопки PDF/Edit/Delete СКРЫТЫ
- Кнопки действий СКРЫТЫ
- Только hero + CTA "Начать приём"
- Текст "Остальные функции откроются после первого приёма"

### Элементы:
1. **Hero** — статус + имя + возраст + конституция + телефон + CTA
2. **FirstTimeHint** — подсказка при первом визите
3. **Кнопки действий** — IntakeLinkButton, ScheduleButton, SendSurveyButton
4. **Запланированные приёмы** — список scheduled
5. **Текущее лечение** — remedy + potency + dosage + SharePrescriptionButton
6. **Follow-up** — FollowupSection
7. **Предупреждение** — если нет назначения
8. **Оплаченные сессии** — PaidSessionsBlock
9. **Анкеты** — collapsible details
10. **Таймлайн лечения** — collapsible details
11. **Фотографии** — collapsible details

---

## ЭТАП 4: Консультация (consultations/[consultationId]/...)

### Данные:
- consultation — текущая запись
- patient — пациент
- previousConsultation — предыдущая (для динамики)
- visitNumber — номер визита
- preVisitSurvey — ответы опросника
- showAI — realPatientCount >= 5

### Элементы:
1. **Header** — breadcrumb + имя + номер визита + статус сохранения
2. **EditorToolbar** — chips: Хронический/Острый + Реперторий + AI
3. **FirstTimeHint** — подсказка
4. **DynamicsBlock** — chips: Улучшение/Обострение/Без изменений/Ухудшение/Без реакции
5. **ComplaintsForm** — жалобы + этиология + collapsible модальности/психика
6. **InlineRx** — препарат autocomplete + потенция chips + дозировка chips
7. **Plan** — контроль и план (input)
8. **Notes** — заметки (textarea)
9. **Finish button** — завершить консультацию
10. **Save indicator** — ✓ Сохранено / Сохраняю...
11. **Right panel** — PreVisitSurveyPanel + контекст + ActiveRemedy
12. **MiniRepertory** — поиск рубрик + анализ (lazy loaded)
13. **Completed screen** — после завершения: отправить назначение + вернуться

### Autosave:
- Каждые 2 сек через ConsultationContext
- Exponential backoff при ошибках
- Optimistic update с откатом

---

## ЭТАП 5: Реперторий (repertory/RepertoryClient.tsx)

### Данные:
- 74 482 рубрики (серверный поиск)
- SECTION_GROUPS — фильтры по главам

### Элементы:
1. **Header** — тёмный, с поиском
2. **Фильтры** — горизонтальные chips разделов
3. **Список рубрик** — с грейдами (жирный/курсив/обычный)
4. **Правая панель "Анализ"** — добавленные рубрики + топ-препараты
5. **Модалы** — назначение, сохранение, выбор пациента

---

## ЭТАП 6: Настройки (settings/page.tsx)

### Элементы:
1. **FirstTimeHint** — подсказка
2. **Учёт оплат** — SettingsToggle (switch)
3. **Напоминания** — FollowupReminderSetting (chips дней)
4. **Расписание** — ScheduleSettings (дни недели + время + обед)
5. **AI-анализ** — кредиты + ссылки на pricing
6. **Правила приёма** — PrescriptionRulesEditor (textarea)
7. **Безопасность** — ChangePasswordSection (3 поля)

---

## ЭТАП 7: Модалки

1. **PrescriptionModal** — назначение при завершении (препарат + потенция)
2. **DeletePatientButton** — подтверждение удаления
3. **FeedbackModal** — форма обратной связи
4. **AddPatientWidget modals** — PrimaryIntakeModal + ExistingPatientModal

---

## ЭТАП 8: Публичные формы

1. **IntakeForm** — 10 шагов анкеты пациента (primary/acute)
2. **PreVisitSurveyForm** — 15 вопросов перед визитом
3. **FollowupForm** — 4 варианта + комментарий
4. **Rx page** — назначение для пациента (препарат + правила)
5. **NewPatientForm** — форма записи нового пациента

---

## ЭТАП 9: Referral (referral/ReferralClient.tsx)

### Элементы:
1. **Ссылка** — readonly input + кнопка Копировать
2. **Шаги** — 3 шага "Как это работает"
3. **Статистика** — приглашено/зарегистрировано/оплатило/бонус

---

## ЭТАП 10: Admin (admin/AdminDashboard.tsx)

### Элементы:
1. **Stat cards** — 4 карточки (врачи/пациенты/консультации/платежи)
2. **Табы** — Обзор/Врачи/Платежи/Рефералы
3. **Список врачей** — с поиском, фильтром тестовых, управление подпиской/AI Pro
4. **Платежи** — история
5. **Рефералы** — приглашения

---

## ЭТАП 11: Виджеты

1. **CalendarWidget** — месячный календарь + записи
2. **LunarPhaseWidget** — фазы луны
3. **Toast** — уведомления (success/error)
4. **FirstTimeHint** — одноразовая подсказка (localStorage)
5. **HelpButton** — плавающая кнопка "?" с FAQ
6. **CookieConsent** — баннер cookie
7. **InteractiveTour** — 32-шаговый тур (по запросу)
8. **OnboardingBanner** — отключён (заменён WelcomeScreen)

---

## ЭТАП 12: Mobile

1. **Sidebar drawer** — 260px, slide from left
2. **Mobile header** — burger + logo + avatar
3. **Consultation tabs** — "Редактор | Контекст" переключатель
4. **Patient card** — 1152px height (collapsible)
5. **Dashboard** — single column, no right panel for < 3 patients
