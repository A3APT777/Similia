import nodemailer from 'nodemailer'

// SMTP-транспорт для отправки email через Mail.ru
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.mail.ru',
  port: parseInt(process.env.SMTP_PORT || '465'),
  secure: true,
  auth: {
    user: process.env.SMTP_USER || 'simillia@mail.ru',
    pass: process.env.SMTP_PASS,
  },
})

// Отправка кода подтверждения при регистрации
export async function sendVerificationCode(to: string, code: string): Promise<void> {
  await transporter.sendMail({
    from: '"Similia" <simillia@mail.ru>',
    to,
    subject: 'Код подтверждения — Similia',
    text: `Ваш код подтверждения: ${code}\n\nВведите этот код на странице регистрации.\nКод действителен 15 минут.\n\nЕсли вы не регистрировались — проигнорируйте это письмо.\n\n---\nSimilia — цифровой кабинет гомеопата\nhttps://simillia.ru`,
    html: `
      <div style="font-family: -apple-system, sans-serif; max-width: 400px; margin: 0 auto; padding: 40px 20px;">
        <p style="font-size: 14px; color: #6b5e45; margin-bottom: 24px;">Similia</p>
        <p style="font-size: 16px; color: #1a1a0a; margin-bottom: 8px;">Ваш код подтверждения:</p>
        <p style="font-size: 36px; font-weight: 300; letter-spacing: 8px; color: #2d6a4f; margin: 16px 0 24px; font-family: 'Courier New', monospace;">${code}</p>
        <p style="font-size: 14px; color: #8a7e6c; line-height: 1.6;">Введите этот код на странице регистрации.<br>Код действителен 15 минут.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 32px 0 16px;">
        <p style="font-size: 12px; color: #b0a890;">Если вы не регистрировались — проигнорируйте это письмо.</p>
        <p style="font-size: 12px; color: #b0a890;">Similia — цифровой кабинет гомеопата · simillia.ru</p>
      </div>
    `,
  })
}

// Генерация 6-значного кода
export function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}
