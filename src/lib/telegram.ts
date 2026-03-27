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

// Отправка ошибок сервера в Telegram (замена Sentry)
export async function reportError(context: string, error: unknown): Promise<void> {
  const msg = error instanceof Error ? error.message : String(error)
  const stack = error instanceof Error ? error.stack?.slice(0, 500) : ''

  sendTelegramAlert(
    `🔴 <b>Ошибка сервера</b>\n\n` +
    `📍 ${context}\n` +
    `❌ ${msg}\n` +
    (stack ? `\n<pre>${stack}</pre>` : '') +
    `\n🕐 ${new Date().toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' })}`
  )
}
