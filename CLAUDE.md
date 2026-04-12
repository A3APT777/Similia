# Similia (CaseBook) — Инструкции для проекта

Веб-сервис для гомеопатов. Ведение пациентов, консультации, реперторизация, назначения.
Production: https://simillia.ru | Стек: Next.js 16 + Supabase + TypeScript + Tailwind 4

## Защищённые файлы — спрашивать перед изменением
- `supabase/migrations/` — миграции БД необратимы
- `src/lib/actions/payments.ts`, `subscription.ts` — логика денег
- `src/lib/supabase/` — клиенты БД, сломается = ляжет весь сайт
- `.env*` — ключи и токены
- `next.config.ts` — конфигурация сборки

## MDRI — ЗАБЛОКИРОВАН (v5-final, tag: mdri-v5-final)

### Engine Core — НЕ МЕНЯТЬ
- `src/lib/mdri/engine.ts` — ranking v5, findRubrics, constellationScore, kentScore
- `src/lib/mdri/synonyms.ts` — symMatch (phrase-level, stem, antonym protection)
- `src/lib/mdri/data-loader.ts` — загрузка данных
- `src/lib/mdri/data/*.json` — реперторий, constellations, polarities

### Product Safety Layer — НЕ МЕНЯТЬ без тестов
- `src/lib/mdri/product-layer.ts` — confidence, validation, keyword fallback
- `src/lib/mdri/types.ts` — ConsensusResult с productConfidence/warnings

### Правила confidence (product-layer.ts):
- INSUFFICIENT: <3 symptoms ИЛИ нет mental+general
- CLARIFY (equal): gap<3% ИЛИ конфликт+gap<10%
- CLARIFY: gap<10% ИЛИ charStrength=0 ИЛИ warnings>=3
- CONFLICT: потолок GOOD (HIGH невозможен)
- HIGH: gap>=15% + charStrength=2 + modalities + coverage>=3 + warnings<=1
- GOOD: всё остальное

### Тесты и результаты
- `scripts/test-50-cases.ts` — 50 тестовых кейсов (ground truth)
- `scripts/test-results-v5-final.txt` — результаты: Top-1 76%, Top-3 92%, Top-5 94%
- `scripts/debug-symMatch.ts` — 55 тестов symMatch (0 false positives)

### Pre-commit hook блокирует engine.ts/synonyms.ts/data-loader.ts
Для изменений: `MDRI=1 git commit -m "..."`
После любого изменения: `npx tsx scripts/test-50-cases.ts`

## Перед деплоем
Пройти `CHECKLIST.md` в корне проекта.

## Перед работой
Прочитать docs/ARCHITECTURE.md для понимания структуры.

## Деплой
- Хостинг: Timeweb (`yc-user@85.239.53.148`), PM2 process `similia`, порт 3003
- Запуск: `/deploy` (wraps `bash deploy-similia.sh`) — build локально, rsync на Timeweb, pm2 restart
- `git push origin main` — **только** в GitHub, прод не обновится сам
- Node v25.8.1: `tsc --noEmit` отдельно, в next.config.ts стоит ignoreBuildErrors
- Anthropic API ходит через Hetzner nginx proxy (Timeweb IP заблокирован)

## Особенности
- Server Actions для всех мутаций (нет REST API кроме webhooks)
- Каждый action начинается с getUser() + фильтр по doctor_id
- Публичные формы (intake, upload, followup, new) — через service client
- i18n: все UI-строки через t('key')
- 3 типа Supabase-клиентов: client (браузер), server (SSR), service (обход RLS)
