import { getNewPatientToken, getDoctorSchedule } from '@/lib/actions/newPatient'
import { createServiceClient } from '@/lib/supabase/service'
import NewPatientForm from './NewPatientForm'

export default async function NewPatientPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const tokenData = await getNewPatientToken(token)

  const isInvalid = !tokenData || tokenData.used || new Date(tokenData.expires_at) < new Date()

  let schedule = null
  let patientName: string | null = null
  const isBookingOnly = tokenData?.patient_id ? true : false

  if (tokenData && !isInvalid) {
    schedule = await getDoctorSchedule(tokenData.doctor_id)

    // Если привязан к существующему пациенту — получаем имя
    if (tokenData.patient_id) {
      const supabase = createServiceClient()
      const { data: patient } = await supabase
        .from('patients')
        .select('name')
        .eq('id', tokenData.patient_id)
        .single()
      patientName = patient?.name || null
    }
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--sim-bg)', padding: '24px 16px' }}>
      <div style={{ maxWidth: 600, margin: '0 auto' }}>
        {/* Логотип */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '36px' }}>
          <svg width="28" height="28" viewBox="0 0 36 36" fill="none">
            <ellipse cx="13" cy="18" rx="7" ry="11" transform="rotate(-15 13 18)" fill="#2d6a4f" opacity="0.9"/>
            <ellipse cx="23" cy="18" rx="7" ry="11" transform="rotate(15 23 18)" fill="var(--sim-forest)" opacity="0.65"/>
            <path d="M18 8 Q18 18 18 28" stroke="var(--sim-forest)" strokeWidth="0.8" strokeLinecap="round"/>
          </svg>
          <span style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: '22px', fontWeight: 400, color: 'var(--sim-forest)', letterSpacing: '0.02em' }}>Similia</span>
        </div>

        {/* Карточка */}
        <div style={{ backgroundColor: '#fff', borderRadius: '16px', padding: '32px 28px', border: '0.5px solid var(--sim-border)', boxShadow: '0 2px 20px rgba(0,0,0,0.06)' }}>
          {isInvalid ? (
            <div style={{ textAlign: 'center', padding: '24px 0' }}>
              <div style={{ fontSize: '40px', marginBottom: '16px' }}>🍂</div>
              <h2 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: '26px', color: 'var(--sim-text)', marginBottom: '10px' }}>
                Ссылка недействительна
              </h2>
              <p style={{ color: 'var(--sim-text-hint)', fontSize: '15px', lineHeight: 1.6 }}>
                Ссылка устарела или уже была использована.<br />
                Обратитесь к врачу за новой ссылкой.
              </p>
            </div>
          ) : (
            <>
              {isBookingOnly && patientName && (
                <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                  <h2 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: '24px', fontWeight: 400, color: 'var(--sim-text)', marginBottom: '8px' }}>
                    Запись на приём
                  </h2>
                  <p style={{ fontSize: '14px', color: 'var(--sim-text-muted)' }}>
                    {patientName}, выберите удобную дату и время
                  </p>
                </div>
              )}
              <NewPatientForm
                token={token}
                doctorId={tokenData!.doctor_id}
                schedule={schedule}
                bookingOnly={isBookingOnly}
                existingPatientId={tokenData!.patient_id || undefined}
              />
            </>
          )}
        </div>
      </div>
    </div>
  )
}
