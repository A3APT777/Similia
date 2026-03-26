---
name: playwright
description: Сделать скриншот страницы Similia через Playwright. Аргумент — URL или путь (например /login, /dashboard).
allowed-tools: Bash, Read
user-invocable: true
---

# Playwright Screenshot

Сделай скриншот страницы Similia для визуальной проверки.

## Аргумент
$ARGUMENTS — URL-путь страницы (например: `/login`, `/dashboard`, `/repertory`)

## Команда

```bash
npx playwright screenshot \
  --browser chromium \
  --viewport-size "1440,900" \
  --wait-for-timeout 2000 \
  "https://simillia.ru$ARGUMENTS" \
  "/tmp/screenshot-$(date +%s).png"
```

Для мобильной версии:
```bash
npx playwright screenshot \
  --browser chromium \
  --device "iPhone 14" \
  --wait-for-timeout 2000 \
  "https://simillia.ru$ARGUMENTS" \
  "/tmp/screenshot-mobile-$(date +%s).png"
```

## После скриншота
1. Покажи скриншот пользователю через Read tool
2. Прокомментируй что видишь — соответствие дизайн-системе, проблемы
3. Если нужна авторизация — предупреди (публичные страницы: `/login`, `/register`, `/intake/*`, `/followup/*`, `/survey/*`, `/rx/*`, `/guide`)
