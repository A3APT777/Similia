# Testing — CaseBook (Similia)

## Текущий статус

**Тестов нет.** Ни jest, ни vitest, ни playwright не настроены.
В package.json только скрипты: `dev`, `build`, `start`, `lint`.

## Что стоит покрыть тестами

### Приоритет 1 — Server Actions (`src/lib/actions/`)
- Валидация входных данных (zod-схемы)
- Проверка конфликтов слотов в `scheduleConsultation`
- Логика токенов в `newPatient.ts`

### Приоритет 2 — Бизнес-логика
- Редьюсер `ConsultationContext` (все action-типы)
- `clinicalEngine.ts` — расчёт оценки симптомов
- `generateSlots()` — генерация временных слотов
- Утилиты: форматирование дат, возраст, плюрализация

### Приоритет 3 — Хуки
- `useLanguage()` — переключение языка
- `useConsultation()` — автосохранение

## Рекомендуемый стек для добавления тестов

```bash
npm install -D vitest @vitejs/plugin-react @testing-library/react
```
