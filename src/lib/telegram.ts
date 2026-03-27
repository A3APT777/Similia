// Отправка уведомлений в Telegram через бота
// Используется для алертов: регистрации, оплаты, ошибки

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN
const CHAT_ID = process.env.TELEGRAM_CHAT_ID

export async function sendTelegramAlert(message: string): Promise<void> {
  if (!BOT_TOKEN || !CHAT_ID) return

  try {
    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: CHAT_ID,
        text: message,
        parse_mode: 'HTML',
      }),
    })
  } catch (err) {
    // Не блокируем основной flow из-за Telegram
    console.error('[telegram] ошибка отправки:', err)
  }
}

// Словарь технических ошибок → понятные описания
const ERROR_EXPLANATIONS: Record<string, string> = {
  'permission denied': 'Нет прав доступа к таблице БД. Нужно дать права пользователю similia.',
  'unique constraint': 'Запись с такими данными уже существует (дубликат).',
  'not-null constraint': 'Обязательное поле не заполнено.',
  'foreign key constraint': 'Ссылка на несуществующую запись в другой таблице.',
  'connection refused': 'БД не отвечает — возможно PostgreSQL упал.',
  'connect ETIMEDOUT': 'Не удалось подключиться к внешнему сервису (таймаут).',
  'connect ECONNREFUSED': 'Внешний сервис отказал в подключении.',
  'SMTP': 'Ошибка отправки email. Проверить SMTP настройки (simillia@mail.ru).',
  'Invalid login': 'Неверные данные для подключения к почтовому серверу.',
  'rate limit': 'Превышен лимит запросов.',
  'out of memory': 'Сервер — нехватка памяти. Перезапустить PM2.',
  'ENOMEM': 'Сервер — нехватка памяти. Перезапустить PM2.',
  'P2010': 'Ошибка SQL запроса. Проверить права или структуру таблицы.',
  'P2002': 'Дубликат — запись с такими данными уже существует.',
  'P2003': 'Нарушение связи таблиц (foreign key).',
  'P2025': 'Запись не найдена в БД.',
}

function explainError(msg: string): string {
  for (const [key, explanation] of Object.entries(ERROR_EXPLANATIONS)) {
    if (msg.toLowerCase().includes(key.toLowerCase())) {
      return explanation
    }
  }
  return 'Неизвестная ошибка. Проверить логи: /status → Логи.'
}

// Отправка ошибок сервера в Telegram (замена Sentry)
export async function reportError(context: string, error: unknown): Promise<void> {
  const msg = error instanceof Error ? error.message : String(error)
  const explanation = explainError(msg)

  // Краткое описание ошибки без стектрейса
  const shortMsg = msg.length > 200 ? msg.slice(0, 200) + '...' : msg

  sendTelegramAlert(
    `🔴 <b>Ошибка на сервере</b>\n\n` +
    `📍 <b>Где:</b> ${context}\n` +
    `💡 <b>Что случилось:</b> ${explanation}\n` +
    `\n🔧 <b>Техническая информация:</b>\n<pre>${shortMsg}</pre>` +
    `\n🕐 ${new Date().toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' })}`
  )
}
