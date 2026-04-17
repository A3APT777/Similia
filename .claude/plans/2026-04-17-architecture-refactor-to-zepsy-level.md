# Задача: привести архитектуру Similia к уровню Zepsy — «как будто это делал senior-архитектор, а не AI»

Дата: 2026-04-17
Связанная задача: архитектурный аудит после сравнения с MiniApp/Zepsy (где `docs/ARCHITECTURE.md` описывает слои, graph зависимостей и parity-тесты).

Это **не одна правка**, а roadmap. Общая трудоёмкость ~47 часов. Предлагается делать поэтапно: первые 2 этапа (5ч) — дешёвые защитные меры. Дальнейшие этапы обсуждать отдельно после завершения предыдущего.

---

## A. Диагноз: чем Similia слабее Zepsy

### A.1. Flat `src/lib/` без физических слоёв (главный AI-tell)

Сейчас в `src/lib/` лежат в одной папке:
- domain-логика: `clinicalEngine.ts`, `subscription.ts`, `remedies.ts`, `slots.ts`, `prescriptionDefaults.ts`
- infrastructure (IO): `email.ts`, `telegram.ts`, `prisma.ts`, `auth.ts`, `supabase/`
- shared utilities: `utils.ts`, `utils/`, `date-utils.ts`, `i18n.ts`, `validation.ts`
- application layer: `actions/`

У Zepsy есть физически отдельные `channels/`, `usecases/`, `notifications/`, `identity/`, `billing/`, `infrastructure/`, `shared/` — с законом направления зависимостей, закреплённым grep-guards в `tests/parity-invariants.test.ts`.

### A.2. Нет единой точки истины для бизнес-операций

- `createPatient` — логика проверки лимита в `actions/patients.ts`, а сам расчёт лимита в `lib/subscription.ts` и ещё параллельно в `actions/subscription.ts::checkPatientLimit()`.
- `completeConsultation` — завершение в `actions/consultations.ts`, а списание сеанса в `actions/payments.ts` (две отдельных транзакции — riсk).
- У Zepsy всё booking собрано в `usecases/booking/{create,cancel,reschedule}.ts` — один файл, одна операция, атомарно.

### A.3. Три autosave-функции дублируют одну операцию

`actions/consultations.ts` экспортирует одновременно `updateConsultationNotes`, `updateConsultationFields`, `updateConsultationExtra` плюс новую `updateConsultationAll`. Старые продолжают существовать — если кто-то вызовет их параллельно, получится race condition. В `ARCHITECTURE.md §13` это признано как «3 autosave action вместо 1».

### A.4. God-компоненты смешивают data + UI + бизнес

- `src/app/repertory/RepertoryClient.tsx` — 1768 строк: поиск, фильтры, пагинация, визуализация, состояние — всё в одном файле.
- `src/app/intake/[token]/IntakeForm.tsx` — 1085+ строк: валидация, submit, успешные состояния, рендеры полей.
- `src/app/patients/[id]/consultations/[consultationId]/ConsultationEditor.tsx` — крупный редактор, смешивает context-логику и UI.

### A.5. Нет defensive import boundaries

У Zepsy `npm run test:parity` падает при импорте `@prisma/client` из `shared/`, `prisma.booking.findUnique` в bot handler, `grammy`/`express` в `shared/` и т.д. У Similia таких автогардов нет. Есть прямые импорты `prisma` из компонентов (`admin/`, `settings/`) — это то, что senior не пустит в review.

### A.6. Дополнительные дыры, признанные самим `ARCHITECTURE.md §13`

- RLS отсутствует на `patients`, `consultations`, `intake_forms`, `followups`, `patient_photos`, `new_patient_tokens`.
- Race condition в `submitIntake` (возможны дубликаты).
- `completeConsultation` + `decrementPaidSession` не атомарны.
- Две сущности с именем `utils` (`lib/utils.ts` + `lib/utils/`).

### A.7. Что Similia уже делает хорошо (не трогать без причины)

- **MDRI engine изолирован** в `src/lib/mdri/` — замкнутый модуль, защищён pre-commit hook. Эталон того, как должен выглядеть domain-слой.
- **Consistent Server Actions auth-pattern** — все actions начинаются с `getUser()` + фильтр по `doctor_id`.
- **Типизированные domain-модели** — `StructuredSymptom`, `CaseState`, `Decision` в `clinicalEngine.ts`.
- **Smart autosave** с debounce и exponential backoff в `ConsultationContext` — это инженерная работа, не AI-slop.
- **i18n consistently** через `t(lang).key` без хардкода строк.
- **Atomic SQL-функции** для опасных операций — `delete_patient_cascade`, `increment_paid_sessions`.

---

## B. Целевое состояние (как у Zepsy)

```
src/
├── app/                          # Next.js роуты — только UI + server actions-обёртки
├── components/                   # переиспользуемые UI-примитивы
└── lib/
    ├── domain/                   # чистая бизнес-логика, zero IO
    │   ├── clinical/             # clinicalEngine, StructuredSymptom, CaseState
    │   ├── subscription/         # лимиты, планы, проверки
    │   ├── repertory/            # слоты, rubrics
    │   └── mdri/                 # (уже изолировано — не трогать)
    ├── usecases/                 # application layer — оркестровка domain + infra
    │   ├── patient/create.ts
    │   ├── consultation/create.ts, complete.ts, prescribe.ts
    │   └── subscription/activate.ts, renew.ts
    ├── actions/                  # тонкие обёртки над usecases (auth + revalidatePath)
    ├── infrastructure/           # IO и внешние зависимости
    │   ├── db/                   # supabase clients
    │   ├── email/                # email.ts
    │   ├── notifications/        # telegram.ts
    │   └── yookassa/             # платёжный шлюз
    └── shared/                   # pure utilities, zero IO, zero framework
        ├── time.ts               # date-utils, formatters
        ├── validation.ts         # zod schemas
        ├── i18n.ts
        └── utils.ts              # cn, getAge
```

**Закон направления зависимостей:**

```
app/, components/ ─→ lib/actions/ ─→ lib/usecases/ ─→ lib/domain/
                                    └─→ lib/infrastructure/ ─→ lib/shared/
                                                              └─→ lib/shared/
```

Запреты (проверяются parity-тестом):
- `lib/shared/` не импортирует `@supabase/*`, `@prisma/client`, `next/*`.
- `lib/domain/` не импортирует `@supabase/*`, `next/*`, ничего из `lib/infrastructure/`, `lib/actions/`, `app/`, `components/`.
- `lib/usecases/` не импортирует `app/`, `components/`.
- `src/components/`, `src/app/*/components/` не импортируют `@supabase/supabase-js` напрямую — только через `lib/actions/`.
- `console.log/warn/error` вне `lib/shared/logger.ts` — запрещено.

---

## C. Этапы рефакторинга

### Этап 1 — ARCHITECTURE.md как контракт (2ч, risk: LOW)

**Что меняем:**
- `docs/ARCHITECTURE.md`: добавить секции «Граф зависимостей» и «Запреты» по образцу Zepsy `docs/ARCHITECTURE.md`.
- Добавить таблицу «Где должна жить логика» (domain / usecases / infrastructure / shared / actions / components / app).
- Добавить раздел «Release gate» с командами `tsc --noEmit && npm run test:parity` перед деплоем.

**Верификация:** файл обновлён, линтер не ругается, ссылки работают.

---

### Этап 2 — Parity-тесты как live-guard (3ч, risk: LOW)

**Что меняем:**
- Создать `tests/parity-invariants.test.ts` с grep-guards:
  - `@supabase/supabase-js` не импортируется из `src/components/`, `src/app/**/components/`.
  - `@/lib/supabase/*` не импортируется из `src/lib/shared/*`.
  - `prisma` / `PrismaClient` не импортируются из `src/components/`, `src/app/**/*.tsx` кроме `server`-компонентов.
  - `console.log|warn|error` вне `src/lib/shared/` / `scripts/`.
  - `import .* from '../actions'` не ведёт в `lib/domain/*`.
- Добавить `npm run test:parity` в `package.json`.
- Внести `npm run test:parity` в `CHECKLIST.md` как обязательный шаг перед деплоем.

**Верификация:** `npm run test:parity` проходит; намеренно сломанный импорт падает.

---

### Этап 3 — `src/lib/shared/` (3ч, risk: LOW)

**Что меняем:**
- Создать `src/lib/shared/` и перенести туда pure utilities:
  - `lib/utils.ts` → `lib/shared/utils.ts` (cn, formatDate, getAge)
  - `lib/date-utils.ts` → `lib/shared/time.ts` (или слить с utils.ts если мелкий)
  - `lib/utils/` → распределить: time-утилиты в `shared/time.ts`, всё остальное честно посмотреть что куда.
  - `lib/validation.ts` → `lib/shared/validation.ts`
  - `lib/i18n.ts`, `lib/i18n-server.ts` → `lib/shared/i18n.ts`, `lib/shared/i18n-server.ts` (или объединить по смыслу).
- Починить импорты через rename-рефактор TS.
- Добавить grep-guard: `lib/shared/` не тянет `@supabase/*`, `next/*`, `@prisma/client`.

**Риск:** много touch-points по импортам. Смягчается rename-рефактором VS Code.

**Верификация:** `npx tsc --noEmit` зелёный; `npm run build` собирает; `npm run test:parity` проходит.

---

### Этап 4 — `src/lib/infrastructure/` (5ч, risk: MEDIUM)

**Что меняем:**
- Создать `src/lib/infrastructure/`:
  - `db/supabase-browser.ts` / `db/supabase-server.ts` / `db/supabase-service.ts` (переезд из `lib/supabase/`)
  - `email/send.ts` (из `lib/email.ts`)
  - `notifications/telegram.ts` (из `lib/telegram.ts`)
  - (позже) `yookassa/` — для логики webhook/ платежей
- Обновить все импорты `@/lib/supabase/*` → `@/lib/infrastructure/db/*`. Лучше сделать alias `@/db/*` в `tsconfig.json` чтобы всё звать коротко.
- Для безопасности перехода сделать re-export из старых путей на 1-2 коммита, потом удалить.

**Риск:** платежи и email — деньги/коммуникации. Каждый перенос проверяется smoke.

**Верификация:** ручное прохождение логина → регистрации → создания платежа; tsc зелёный; dev-сервер запускается.

---

### Этап 5 — `src/lib/domain/` (6ч, risk: MEDIUM)

**Что меняем:**
- `lib/clinicalEngine.ts` → `lib/domain/clinical/engine.ts` + `lib/domain/clinical/types.ts` (StructuredSymptom, CaseState, Decision).
- `lib/subscription.ts` → `lib/domain/subscription/plans.ts` (константы, getPlanLimits pure функции).
- `lib/remedies.ts` → `lib/domain/remedies/index.ts` если это действительно domain (справочник). Если просто статика — можно в `shared/`.
- `lib/slots.ts` → `lib/domain/schedule/slots.ts`.
- `lib/prescriptionDefaults.ts` → `lib/domain/prescription/defaults.ts`.
- `lib/mdri/` — **НЕ ТРОГАТЬ** (защищён pre-commit hook, engine заблокирован).
- Добавить grep-guard: `lib/domain/` не импортирует `@supabase/*`, `next/*`, `lib/actions/*`, `lib/infrastructure/*`.

**Риск:** domain-чистота — это то ради чего всё затевается. Любой IO в domain — сразу чинить в том же коммите.

**Верификация:** tsc + parity-тесты; `npm run test` (vitest в `lib/__tests__/` — перенести в `tests/` позже).

---

### Этап 6 — `src/lib/usecases/` (12ч, risk: HIGH)

**Что меняем:**
- Создать `src/lib/usecases/` и вынести бизнес-операции, собрав разбросанную логику в одну точку истины:
  - `usecases/patient/create.ts` — входной contract `{ doctorId, formData }` → `Result`. Внутри: `checkPatientLimit` (из domain), `db.patients.insert`, `revalidatePath`. Actions `createPatient` становится тонкой обёрткой над ним.
  - `usecases/consultation/create.ts` — createConsultation + close previous in_progress (сейчас это в actions).
  - `usecases/consultation/complete.ts` — **атомарно**: clinical_assessment через `clinicalEngine` + decrementPaidSession (решает §13 race).
  - `usecases/consultation/prescribe.ts` — savePrescription.
  - `usecases/subscription/activate.ts`, `renew.ts`, `cancel.ts`.
- `actions/*.ts` → тонкие обёртки: auth + validation + вызов usecase + revalidatePath.
- Запретить в actions прямые `.from('...').update(...)` — только через usecase (grep-guard, по списку таблиц).

**Риск:** HIGH. Переписывается application-слой. Нужны:
- vitest тесты на каждый usecase (happy path + edge);
- прогон на dev Supabase;
- smoke-чеклист перед деплоем.

**Верификация:** все 220 существующих vitest тестов проходят; добавлены новые тесты на usecases; smoke через `CHECKLIST.md`.

---

### Этап 7 — Удалить deprecated autosave-функции (2ч, risk: MEDIUM)

**Что меняем:**
- `actions/consultations.ts`: удалить `updateConsultationNotes`, `updateConsultationFields`, `updateConsultationExtra`.
- Оставить только `updateConsultationAll` (или переименовать в `updateConsultation`).
- Убедиться что `ConsultationContext.tsx` уже использует только новую.

**Риск:** если есть забытые call-sites — упадут компилятор и сборка; ловим на `tsc --noEmit`.

**Верификация:** grep по `updateConsultationNotes|Fields|Extra` — пусто; tsc зелёный; ручной autosave в консультации работает.

---

### Этап 8 — Починить Server Components с прямым `prisma` (2ч, risk: LOW)

**Что меняем:**
- `src/app/admin/page.tsx`, `src/app/admin/ai-logs/page.tsx`, `src/app/settings/page.tsx` — вынести `prisma.*` вызовы в соответствующие Server Actions (`lib/actions/admin.ts`, `lib/actions/settings.ts`) или в usecases после Этапа 6.
- Аналогично — любые прямые `supabase.from(...)` из компонентов.

**Верификация:** страницы открываются, grep-guard `prisma` в `src/app/**/*.tsx` — пусто.

---

### Этап 9 — Атомарная `completeConsultation` (4ч, risk: HIGH)

**Что меняем:**
- Создать SQL-функцию `complete_consultation_atomic(consultation_id, doctor_id)` которая в одной транзакции:
  - записывает `clinical_assessment`
  - декрементит `paid_sessions` (если включено)
  - устанавливает status='completed'
- `usecases/consultation/complete.ts` вызывает RPC вместо двух отдельных запросов.
- Добавить тест: 2 параллельных завершения → списывается только 1 сеанс.

**Риск:** HIGH — деньги. Обязательно staging-прогон.

**Верификация:** unit-тест на RPC + ручное прохождение на dev.

---

### Этап 10 — RLS на оставшиеся таблицы (6ч, risk: HIGH)

**Что меняем:**
- Включить RLS на `patients`, `consultations`, `intake_forms`, `followups`, `patient_photos`, `new_patient_tokens`.
- Политики: `doctor_id = auth.uid()` для SELECT/UPDATE/DELETE + `auth.uid() IS NOT NULL` для INSERT.
- Service client (публичные операции) остаётся — он обходит RLS.
- Интеграционный тест: попытка доступа к чужому пациенту → отказ.

**Риск:** HIGH. Может сломать Server Actions которые забыли про `.eq('doctor_id', user.id)` и полагались на его отсутствие. Придётся пройти по всем actions и убедиться.

**Верификация:** staging-прогон полного сценария (логин, создание пациента, консультация, intake, followup, upload, payment) + integration-тест.

---

### Этап 11 — Разбить god-components (14ч, risk: HIGH)

**Что меняем (отдельными задачами по одной штуке):**

**11a. `RepertoryClient.tsx` (1768 строк)** → 3 компонента:
- `RepertoryContainer.tsx` — состояние, API-вызовы, фильтры
- `RepertorySearchBar.tsx` — ввод + фильтры
- `RepertoryResultsView.tsx` — отображение результатов/графиков

**11b. `IntakeForm.tsx` (1085 строк)** → 3 компонента:
- `IntakeFormContainer.tsx` — валидация, submit, успешное состояние
- `IntakeFormView.tsx` — чистая форма
- `IntakeFieldRenderer.tsx` — рендер поля по типу

**Риск:** HIGH. Много локального state + эффекты + UX. Нужен side-by-side скриншот-тест до/после через `similia-playwright`.

**Верификация:** Playwright скриншоты на `/repertory` и `/intake/[token]` — pixel-diff минимальный.

---

## D. Что НЕ трогаем (out of scope)

- **`src/lib/mdri/`** — заблокирован в CLAUDE.md, pre-commit hook. НЕ переносить, НЕ переименовывать, НЕ менять поведение. Его положение как уже-изолированного domain-модуля — образец, а не предмет правки.
- **MDRI engine metrics и тесты** — `scripts/test-50-cases.ts`, `scripts/test-results-v5-final.txt`, `scripts/debug-symMatch.ts`.
- **Логика платежей (ЮKassa webhook)** — `src/app/api/yookassa-webhook/route.ts`. Касаемся только при Этапе 9/10, строго под staging-прогон.
- **Pre-commit hook** и `MDRI=1 git commit` контракт.
- **Supabase миграции, которые уже в прод** — только новые миграции наверх.
- **Конкретные UI/UX решения** компонентов (стили, цвета, расположение) — архитектура не лечит дизайн.
- **Next.js `proxy.ts`** — trust существующей реализации (auth + CSP + rate-limit).
- **`next.config.ts`** — Node v25 OOM workaround (`ignoreBuildErrors`) не трогаем в этой задаче.

---

## E. Риски и открытые вопросы

### Риски
1. **Деньги и данные.** Этапы 6, 9, 10 касаются платежей и RLS. Любая ошибка = потеря денег или утечка данных. Требуют staging-прогон + smoke-чеклист.
2. **Разваливание импортов.** Этапы 3, 4, 5 — массовые переносы файлов. Смягчается TS rename-рефактором и alias'ами в `tsconfig.json`.
3. **Сроки.** 47 часов — это ~6 рабочих дней без параллельной разработки фич. Реально растянется на 2-3 недели.
4. **Регрессии в UI.** Этап 11 (god-компоненты) — HIGH risk для UX. Только с Playwright скриншотами до/после.
5. **Vercel/Timeweb mismatch.** В Similia CLAUDE.md указан Timeweb + PM2, в `ARCHITECTURE.md` — Vercel. Это уже inconsistency — уточнить у Артура до начала Этапа 1.

### Открытые вопросы к Артуру
1. **Порядок и темп.** Рекомендую начать с Этапов 1-2 (5ч) — защитные меры, которые дадут инфраструктуру для остальных. Согласен?
2. **Vercel vs Timeweb** — где сейчас реально живёт Similia (в `CLAUDE.md` Timeweb+PM2, в `docs/ARCHITECTURE.md §12` — Vercel)? Это нужно выровнять в Этапе 1.
3. **Что в приоритете — рефакторинг или новые фичи?** Если параллельно разрабатываются фичи, рекомендую делать только Этапы 1-2-3-5 (не ломают слои usecases/actions), а Этапы 6, 9, 10 выносить в feature-freeze окно.
4. **Есть ли staging-среда?** Этапы 9, 10 без staging = русская рулетка. Если её нет, первый саб-этап — поднять staging Supabase.
5. **Разбивать ли на отдельные PR?** Рекомендую: каждый этап — отдельный PR, отдельный деплой, отдельный smoke. Большие PR тут не годятся.

---

## F. Порядок выполнения (первая волна)

Не делаем весь roadmap за один присест. Первая волна = защитные меры + дешёвая чистка:

1. **Этап 1** — обновить `docs/ARCHITECTURE.md` (graph зависимостей, запреты, release gate). [2ч, LOW]
2. **Этап 2** — написать `tests/parity-invariants.test.ts` и `npm run test:parity`. [3ч, LOW]
3. **Этап 3** — вынести `src/lib/shared/`. [3ч, LOW]
4. **Этап 8** — починить прямые `prisma` в Server Components (`admin/`, `settings/`). [2ч, LOW]

Итого первой волны: **10 часов, все риски LOW**. После неё — обсудить с Артуром что дальше (обычно хочется делать Этап 5 domain/, потом Этап 4 infrastructure/, потом Этап 6 usecases/ — но это уже medium/high риски, отдельным планом).

---

## G. Верификация по этапам

| Этап | Проверка |
|------|----------|
| 1 | `docs/ARCHITECTURE.md` обновлён, содержит граф зависимостей + запреты |
| 2 | `npm run test:parity` проходит; намеренно сломанный импорт падает; команда в `CHECKLIST.md` |
| 3 | `npx tsc --noEmit` + `npm run build` + `npm run test:parity` зелёные; grep `@supabase` в `lib/shared/` — пусто |
| 4 | Логин + регистрация + создание платежа работают в dev; tsc зелёный |
| 5 | 220 vitest-тестов в `lib/__tests__/` проходят; grep в `lib/domain/` по `supabase\|next/` — пусто |
| 6 | Новые тесты usecases + regression 220 штук; smoke по `CHECKLIST.md` |
| 7 | grep по старым именам — пусто; ручной autosave работает |
| 8 | grep `prisma` в `src/app/**/*.tsx` — пусто; страницы открываются |
| 9 | Unit + staging-прогон complete consultation; 2 параллельных запроса — 1 списание |
| 10 | Integration-тест cross-doctor access — DENIED; staging full-flow работает |
| 11 | Playwright скриншоты pre/post; pixel-diff минимальный |
