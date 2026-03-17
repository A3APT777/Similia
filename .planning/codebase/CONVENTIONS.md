# Conventions — CaseBook (Similia)

## TypeScript

- `strict: true` в tsconfig.json
- Пропсы типизируются как `type Props` в начале файла
- Деструктуризация пропсов в сигнатуре функции
- Дженерики: `useReducer<State, Action>`

## 'use client' / 'use server'

- `'use client'` — все формы, интерактивные компоненты, хуки
- `'use server'` — все файлы в `src/lib/actions/*.ts`
- Чёткое разделение: UI-логика на клиенте, мутации данных на сервере

## Именование

- Файлы: PascalCase для компонентов (`PatientForm.tsx`, `ConsultationEditor.tsx`)
- Функции: camelCase
- Константы: SCREAMING_SNAKE_CASE (`CONSTITUTIONAL_TYPES`, `STORAGE_KEY`)
- Типы TypeScript: PascalCase (`Consultation`, `Patient`, `Lang`)

## Стейт

- Context + useReducer для сложного стейта (`ConsultationContext`)
- localStorage + кастомные события для синхронизации языка между вкладками
- Refs для таймеров автосохранения (без внешних библиотек стейта)

## Обработка ошибок

- Server actions: `throw new Error()` при ошибках валидации или БД
- Клиент: error.tsx boundary для необработанных ошибок
- Логирование: `console.error('[имяФункции] описание:', error)`
- Supabase: `if (error) throw new Error(error.message)`

## i18n

- Централизованный словарь: `src/lib/i18n.ts`
- Хук: `useLanguage()` — хранит язык в localStorage
- Использование: `t(lang).dashboard.greeting`
- Языки: `'ru'` и `'en'`

## CSS / Стили

- Tailwind CSS 4 + PostCSS
- Токены темы в `src/styles/theme.css` (CSS custom properties)
- Инлайн-стили через переменные: `style={{ color: 'var(--sim-green)' }}`
- shadcn/ui компоненты с CVA-вариантами
- CSS-модули не используются

## Паттерны компонентов

- CVA (class-variance-authority) в Button для вариантов
- Server Components по умолчанию, `'use client'` только когда нужен стейт/события
- Автосохранение через debounce + useRef для таймера
