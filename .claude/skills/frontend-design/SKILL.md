---
name: frontend-design
description: Редизайн страницы/компонента в стиле Apple/Linear. Аргумент — путь к файлу или название страницы.
allowed-tools: Bash, Read, Edit, Write, Glob, Grep, Agent
user-invocable: true
---

# Frontend Design — Similia Design System

Переработай указанный компонент/страницу в стиле Apple/Linear минимализма.

## Аргумент
$ARGUMENTS — путь к файлу или название страницы (например: `src/app/login/page.tsx` или `login`)

## Дизайн-система Similia

### Цвета
- Primary: `#2d6a4f` (deep forest green) — кнопки, акценты, ссылки
- Background: `#f7f3ed` (parchment) — фон страниц
- Gold: `#c8a035` — акценты, бейджи
- Text: `#1a1a1a` — основной текст
- Muted: `#6b7280` — вторичный текст
- White: `#ffffff` — карточки
- Error: `#dc2626`

### Типографика
- Заголовки: `font-family: 'Cormorant Garamond', serif` — h1/h2/h3
- Body: системный шрифт (Inter/system-ui)
- Labels: `text-[11px] uppercase tracking-wider text-gray-500 font-medium`

### Компоненты
- Кнопки: pill стиль (`rounded-full px-6 py-2.5`), hover: `translateY(-1px) + shadow`
- Карточки: `rounded-xl bg-white shadow-sm border border-gray-100 p-6`
- Инпуты: `rounded-xl border-gray-200 focus:border-[#2d6a4f] focus:ring-[#2d6a4f]/20`
- Двуслойные тени: `shadow-[0_1px_3px_rgba(0,0,0,0.04),0_6px_24px_rgba(0,0,0,0.06)]`

### Принципы
- Много воздуха (generous padding/margin)
- Минимализм — убирать лишнее, не добавлять
- Центрированные формы на parchment фоне
- Анимации: subtle, 200-300ms transitions
- Mobile-first, responsive

## Процесс

1. **Прочитай** текущий файл и пойми что он делает
2. **Сделай скриншот** текущего состояния через `/playwright` (если доступен)
3. **Переработай** дизайн по правилам выше
4. **Проверь**: все интерактивные элементы работают, нет сломанной логики
5. **Сделай скриншот** результата для сравнения

## Чеклист
- [ ] Cormorant Garamond на заголовках
- [ ] Pill кнопки с hover-эффектом
- [ ] rounded-xl карточки
- [ ] 11px uppercase labels
- [ ] Parchment фон (#f7f3ed)
- [ ] Forest green (#2d6a4f) акценты
- [ ] Responsive (mobile + desktop)
- [ ] Нет хардкод цветов вне дизайн-системы
