import { ImageResponse } from 'next/og'

export const alt = 'Similia — думайте о пациенте, не о бумагах'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: 'linear-gradient(135deg, #1a3020 0%, #2d6a4f 100%)',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          padding: '64px 88px',
          justifyContent: 'space-between',
        }}
      >
        {/* Верх: логотип */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            width: '44px', height: '44px', borderRadius: '50%',
            background: 'rgba(255,255,255,0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <div style={{ width: '16px', height: '16px', borderRadius: '50%', background: 'rgba(255,255,255,0.85)', display: 'flex' }} />
          </div>
          <span style={{ fontSize: '26px', color: 'rgba(255,255,255,0.9)', fontWeight: 500 }}>
            Similia
          </span>
          <span style={{ marginLeft: '16px', fontSize: '13px', color: 'rgba(255,255,255,0.4)', display: 'flex' }}>
            simillia.ru
          </span>
        </div>

        {/* Центр: заголовок */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <div style={{ fontSize: '64px', fontWeight: 300, color: '#ffffff', lineHeight: 1.1 }}>
            Думайте о пациенте.
          </div>
          <div style={{ fontSize: '64px', fontWeight: 300, color: '#7dd4a8', lineHeight: 1.1 }}>
            Не о бумагах.
          </div>
          <div style={{ fontSize: '24px', color: 'rgba(255,255,255,0.55)', display: 'flex' }}>
            Цифровой кабинет для практикующего гомеопата
          </div>
        </div>

        {/* Низ: фичи */}
        <div style={{ display: 'flex', gap: '12px' }}>
          <div style={{ display: 'flex', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '10px', padding: '10px 18px' }}>
            <span style={{ fontSize: '16px', color: 'rgba(255,255,255,0.75)', display: 'flex' }}>Карточки пациентов</span>
          </div>
          <div style={{ display: 'flex', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '10px', padding: '10px 18px' }}>
            <span style={{ fontSize: '16px', color: 'rgba(255,255,255,0.75)', display: 'flex' }}>Реперторий Кента</span>
          </div>
          <div style={{ display: 'flex', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '10px', padding: '10px 18px' }}>
            <span style={{ fontSize: '16px', color: 'rgba(255,255,255,0.75)', display: 'flex' }}>Динамика лечения</span>
          </div>
          <div style={{ display: 'flex', background: '#2d6a4f', borderRadius: '10px', padding: '10px 20px' }}>
            <span style={{ fontSize: '16px', color: 'white', fontWeight: 600, display: 'flex' }}>Бесплатно</span>
          </div>
        </div>
      </div>
    ),
    { ...size }
  )
}
