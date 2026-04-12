---
name: deploy
description: Задеплоить Similia на Timeweb через PM2. Используй когда нужно выпустить новую версию.
allowed-tools: Bash
---

Деплой Similia:

1. Запусти `bash /home/artur/projects/Similia/deploy-similia.sh` — скрипт соберёт
   проект локально, отправит на Timeweb (`yc-user@85.239.53.148`), сделает
   `pm2 restart similia` (порт 3003).
2. Если скрипт упал на билде — покажи ошибки, не продолжай.
3. После успешного деплоя сообщи пользователю что релиз выехал на https://simillia.ru.
