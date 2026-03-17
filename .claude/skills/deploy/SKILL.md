---
name: deploy
description: Задеплоить проект Similia на Vercel. Используй когда нужно выпустить новую версию.
allowed-tools: Bash
---

Задеплой проект Similia на Vercel:

1. Убедись что билд чистый: `cd c:/projects/casebook && npx next build`
2. Если билд прошёл — деплой:
   ```
   export PATH="$PATH:/c/Program Files/nodejs:/c/Users/ARTASHES/AppData/Roaming/npm"
   npx vercel --prod --yes --token vcp_5VNaIybfsMNA5dbmSXqgwdYa2xvI8QHOUori2BCYsi9pTVZsqP3zw8fB
   ```
3. Сообщи пользователю URL деплоя и что он задеплоен на simillia.ru
