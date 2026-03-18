import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'Similia — картотека для гомеопата'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: '#ede7dd',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Зелёная полоса сверху */}
        <div style={{ width: '100%', height: '10px', background: '#2d6a4f', display: 'flex' }} />

        {/* Декоративные круги */}
        <div style={{
          position: 'absolute', top: '-100px', right: '-100px',
          width: '500px', height: '500px', borderRadius: '50%',
          border: '2px solid rgba(45,106,79,0.15)', display: 'flex',
        }} />
        <div style={{
          position: 'absolute', bottom: '-120px', left: '-120px',
          width: '480px', height: '480px', borderRadius: '50%',
          border: '2px solid rgba(45,106,79,0.10)', display: 'flex',
        }} />

        {/* Контент */}
        <div style={{
          display: 'flex', flexDirection: 'column', flex: 1,
          padding: '60px 80px', justifyContent: 'space-between',
        }}>

          {/* Верх: логотип + домен */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{
              width: '52px', height: '52px', borderRadius: '50%',
              background: '#2d6a4f', display: 'flex',
              alignItems: 'center', justifyContent: 'center',
            }}>
              <div style={{
                width: '22px', height: '22px', borderRadius: '50%',
                background: 'rgba(255,255,255,0.9)', display: 'flex',
              }} />
            </div>
            <span style={{ fontSize: '20px', color: '#9a8a6a', fontFamily: 'serif', letterSpacing: '1px' }}>
              simillia.ru
            </span>
          </div>

          {/* Центр: название + подзаголовок */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{
              fontSize: '96px', fontWeight: 700, color: '#1a3020',
              fontFamily: 'Georgia, serif', lineHeight: 0.9,
              letterSpacing: '-2px',
            }}>
              Similia
            </div>
            <div style={{
              fontSize: '32px', color: '#4a7060',
              fontFamily: 'Georgia, serif', fontWeight: 400,
            }}>
              Цифровой кабинет гомеопата
            </div>
          </div>

          {/* Низ: три фичи */}
          <div style={{ display: 'flex', gap: '20px' }}>
            {[
              'Карточки пациентов',
              'Реперторий Кента',
              'Динамика состояния',
            ].map(text => (
              <div key={text} style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                background: 'rgba(45,106,79,0.10)',
                border: '1px solid rgba(45,106,79,0.20)',
                borderRadius: '12px', padding: '12px 22px',
              }}>
                <span style={{ fontSize: '18px', color: '#2d4030', fontFamily: 'Georgia, serif' }}>{text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Градиентная полоса снизу */}
        <div style={{ width: '100%', height: '8px', background: '#2d6a4f', display: 'flex' }} />
      </div>
    ),
    { ...size }
  )
}
