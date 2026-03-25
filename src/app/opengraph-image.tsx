import { ImageResponse } from 'next/og'

export const alt = 'Similia — цифровой кабинет гомеопата'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: '#1e3a2f',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '64px 80px',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Тонкая горизонтальная линия — единственный декор */}
        <div style={{
          position: 'absolute',
          top: '0',
          left: '0',
          right: '0',
          height: '2px',
          background: 'linear-gradient(to right, #4ebb8a, rgba(78,187,138,0.1))',
          display: 'flex',
        }} />

        {/* Вертикальная линия-акцент слева */}
        <div style={{
          position: 'absolute',
          left: '80px',
          top: '180px',
          bottom: '180px',
          width: '1px',
          background: 'rgba(255,255,255,0.06)',
          display: 'flex',
        }} />

        {/* Верх: логотип */}
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <span style={{
            fontSize: '22px',
            fontWeight: 300,
            color: 'rgba(255,255,255,0.5)',
            letterSpacing: '0.12em',
            textTransform: 'uppercase' as const,
          }}>
            Similia
          </span>
        </div>

        {/* Центр: заголовок */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', paddingLeft: '20px' }}>
          <div style={{
            fontSize: '52px',
            fontWeight: 300,
            color: '#f7f3ed',
            lineHeight: 1.15,
            letterSpacing: '-0.02em',
          }}>
            Цифровой кабинет
          </div>
          <div style={{
            fontSize: '52px',
            fontWeight: 300,
            color: '#4ebb8a',
            lineHeight: 1.15,
            letterSpacing: '-0.02em',
          }}>
            гомеопата
          </div>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            marginTop: '8px',
          }}>
            <span style={{ fontSize: '15px', color: 'rgba(255,255,255,0.3)', letterSpacing: '0.03em' }}>
              Реперторий Кента
            </span>
            <span style={{ fontSize: '15px', color: 'rgba(255,255,255,0.12)', display: 'flex' }}>·</span>
            <span style={{ fontSize: '15px', color: 'rgba(255,255,255,0.3)', letterSpacing: '0.03em' }}>
              AI-анализ
            </span>
            <span style={{ fontSize: '15px', color: 'rgba(255,255,255,0.12)', display: 'flex' }}>·</span>
            <span style={{ fontSize: '15px', color: 'rgba(255,255,255,0.3)', letterSpacing: '0.03em' }}>
              Консультации
            </span>
          </div>
        </div>

        {/* Низ: URL + CTA */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{
            fontSize: '14px',
            color: 'rgba(255,255,255,0.2)',
            letterSpacing: '0.08em',
          }}>
            simillia.ru
          </span>
          <div style={{
            display: 'flex',
            background: 'rgba(78,187,138,0.15)',
            border: '1px solid rgba(78,187,138,0.25)',
            borderRadius: '100px',
            padding: '10px 28px',
          }}>
            <span style={{
              fontSize: '14px',
              color: '#4ebb8a',
              fontWeight: 500,
              letterSpacing: '0.03em',
            }}>
              Начать работу →
            </span>
          </div>
        </div>
      </div>
    ),
    { ...size }
  )
}
