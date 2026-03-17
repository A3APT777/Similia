// Пересоздание демо-пациентов для аккаунта triarta@mail.ru
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { randomUUID } from 'crypto'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const envContent = readFileSync(resolve(__dirname, '..', '.env.local'), 'utf-8')
const env = {}
for (const line of envContent.split('\n')) {
  const m = line.match(/^([^=]+)=(.*)$/)
  if (m) env[m[1].trim()] = m[2].trim()
}

const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
const doctorId = '8a507cc7-d28c-4aee-8ee6-4f2ceb22da0e'

const daysAgo = (n) => {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString().split('T')[0]
}

const scheduledAt = (daysOffset, hour) => {
  const d = new Date()
  d.setDate(d.getDate() + daysOffset)
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), hour - 3, 0, 0)).toISOString()
}

const tok = () => randomUUID().replace(/-/g, '')

// ── Удаляем всё ──
const { data: old } = await sb.from('patients').select('id').eq('doctor_id', doctorId)
for (const p of (old || [])) {
  const pid = p.id
  await sb.from('payment_history').delete().eq('patient_id', pid)
  await sb.from('patient_photos').delete().eq('patient_id', pid)
  await sb.from('photo_upload_tokens').delete().eq('patient_id', pid)
  const { data: cons } = await sb.from('consultations').select('id').eq('patient_id', pid)
  if (cons?.length) await sb.from('followups').delete().in('consultation_id', cons.map(c => c.id))
  await sb.from('consultations').delete().eq('patient_id', pid)
  await sb.from('intake_forms').delete().eq('patient_id', pid)
  await sb.from('new_patient_tokens').delete().eq('patient_id', pid)
  await sb.from('patients').delete().eq('id', pid)
}
console.log('Старые данные удалены')

// ═══════════════════════════════════════════════════════════════
// ПАЦИЕНТ 1: Хронический случай с полной историей
// ═══════════════════════════════════════════════════════════════
const { data: p1 } = await sb.from('patients').insert({
  doctor_id: doctorId,
  name: 'Иванова Мария Сергеевна',
  birth_date: '1984-03-15',
  phone: '+7 (916) 234-56-78',
  email: 'demo@example.com',
  constitutional_type: 'Natrum Muriaticum',
  notes: '\u26a0\ufe0f Тестовый пациент. Хроническая мигрень с аурой.',
  first_visit_date: daysAgo(62),
}).select('id').single()

if (p1) {
  // Первичная анкета
  await sb.from('intake_forms').insert({
    token: tok(), doctor_id: doctorId, patient_id: p1.id,
    patient_name: 'Иванова Мария Сергеевна', type: 'primary', status: 'completed',
    completed_at: new Date(Date.now() - 62 * 86400000).toISOString(),
    expires_at: new Date(Date.now() + 365 * 86400000).toISOString(),
    answers: {
      patient_name: 'Иванова Мария Сергеевна',
      chief_complaint: 'Мигрень с аурой 3-4 раза в месяц. Пульсирующая боль справа, тошнота, фотофобия.',
      duration: '8 лет, усилилось после родов',
      worse_from: 'Яркий свет, шум, погода, стресс, менструация',
      better_from: 'Тёмная комната, прохлада, сон, давление',
      emotional: 'Тревога, раздражительность, плаксивость',
      sleep: 'Поверхностный, тревожные сны',
      food_desires: 'Шоколад, солёное, молочное',
      food_aversions: 'Жирное мясо, яйца',
    },
  })

  // Консультация 1 — первичная
  const { data: c1 } = await sb.from('consultations').insert({
    patient_id: p1.id, doctor_id: doctorId, date: daysAgo(60),
    status: 'completed', type: 'chronic',
    complaints: 'Мигрень с аурой, 3-4 раза/мес. Аура: мерцающие зигзаги справа 20-30 мин. Пульсирующая боль, тошнота, фото/фонофобия. Приступ 12-24 часа.',
    observations: 'МОДАЛЬНОСТИ\nХуже: свет, запахи, шум, погода, менструация, стресс\nЛучше: темнота, прохлада, давление, сон\n\nОБЩЕЕ\nЖаркая, жажда умеренная, пот ночной\nСон поверхностный, тревожные сны\n\nПСИХИКА\nКонтроль, сдержанность, плачет наедине, тревога за детей',
    notes: 'DD: Nat-m vs Sepia vs Lachesis\nЗакрытость, жаркая, правосторонняя мигрень = Nat-m\n\n\u26a0\ufe0f Тестовый пациент',
    recommendations: 'Bryonia 30C при приступе. Повтор через 2ч. Повторный приём через 4 недели.',
    remedy: 'Bryonia', potency: '30C', pellets: 5,
    dosage: '5 гранул под язык при приступе',
  }).select('id').single()

  if (c1) {
    await sb.from('followups').insert({
      consultation_id: c1.id, patient_id: p1.id, token: tok(),
      status: 'better',
      comment: 'Bryonia помогает: боль за 4-5ч вместо 12-18. Тошнота меньше. Приступы 2/мес вместо 3-4.',
      sent_at: new Date(Date.now() - 40 * 86400000).toISOString(),
      responded_at: new Date(Date.now() - 38 * 86400000).toISOString(),
    })
  }

  // Консультация 2 — повторная
  const { data: c2 } = await sb.from('consultations').insert({
    patient_id: p1.id, doctor_id: doctorId, date: daysAgo(30),
    status: 'completed', type: 'chronic',
    complaints: 'Мигрени реже: 2/мес (было 3-4). Короче. Эмоционально легче.',
    observations: 'ДИНАМИКА\nBryonia: боль за 4-5ч, тошнота меньше\n\nНОВОЕ\n- Хуже от утешения\n- Хуже от солнца/жары\n- Горе: смерть отца 5 лет назад\n- Тяга к соли, шоколаду\n- Мигрени во 2-й день менструации\n\nКОНСТИТУЦИЯ\nNat-m: закрытость, горе внутри, хуже от утешения/жары',
    notes: 'Впервые плакала на приёме. Напряжение с мужем.\n\n\u26a0\ufe0f Тестовый пациент',
    recommendations: 'Nat-m 200C однократно. Наблюдение 4-6 нед.',
    reaction_to_previous: 'Bryonia 30C — хорошо. Приступы короче и реже.',
    remedy: 'Natrum Muriaticum', potency: '200C', pellets: 1,
    dosage: '1 гранула однократно, вечером',
  }).select('id').single()

  if (c2) {
    await sb.from('followups').insert({
      consultation_id: c2.id, patient_id: p1.id, token: tok(),
      status: 'better',
      comment: '3 недели без мигреней! Сплю лучше, тревога меньше, эмоционально легче.',
      sent_at: new Date(Date.now() - 14 * 86400000).toISOString(),
      responded_at: new Date(Date.now() - 10 * 86400000).toISOString(),
    })
  }

  // Запланированный приём
  await sb.from('consultations').insert({
    patient_id: p1.id, doctor_id: doctorId, date: daysAgo(-3),
    status: 'scheduled', type: 'chronic',
    scheduled_at: scheduledAt(3, 10),
    complaints: '', observations: '', notes: '', recommendations: '',
  })

  console.log('\u2713 Пациент 1: Иванова (хрон, 2 приёма + follow-up + запланированный)')
}

// ═══════════════════════════════════════════════════════════════
// ПАЦИЕНТ 2: Острый случай ребёнка
// ═══════════════════════════════════════════════════════════════
const { data: p2 } = await sb.from('patients').insert({
  doctor_id: doctorId,
  name: 'Петров Дима',
  birth_date: '2019-07-22',
  phone: '+7 (903) 456-78-90',
  notes: '\u26a0\ufe0f Тестовый пациент. Ребёнок, мама Петрова Анна.',
  first_visit_date: daysAgo(5),
}).select('id').single()

if (p2) {
  const { data: c3 } = await sb.from('consultations').insert({
    patient_id: p2.id, doctor_id: doctorId, date: daysAgo(5),
    status: 'completed', type: 'acute',
    complaints: 'Температура 39.2, сухой лающий кашель, беспокойство ночью. Начало: внезапно после прогулки на холодном ветру.',
    observations: 'СИМПТОМЫ\nТемпература 39.2, сухой лающий кашель, хуже после полуночи\nБеспокойный, пугливый, пьёт маленькими глотками\nКожа горячая, сухая\n\nМОДАЛЬНОСТИ\nХуже: после полуночи, холодный воздух, одиночество\nЛучше: тепло, мамины объятия, тёплое питьё',
    notes: 'Классический Aconitum: внезапное начало от холодного ветра, страх, беспокойство, жажда.\n\n\u26a0\ufe0f Тестовый пациент',
    recommendations: 'Aconitum 30C каждые 2 часа при температуре. При улучшении реже. Обильное тёплое питьё. Контроль через 24ч.',
    remedy: 'Aconitum', potency: '30C', pellets: 3,
    dosage: '3 гранулы каждые 2 часа',
  }).select('id').single()

  if (c3) {
    await sb.from('followups').insert({
      consultation_id: c3.id, patient_id: p2.id, token: tok(),
      status: 'better',
      comment: 'Температура 37.4 к утру. Кашель влажный. Спал спокойно. Аппетит появился.',
      sent_at: new Date(Date.now() - 4 * 86400000).toISOString(),
      responded_at: new Date(Date.now() - 3 * 86400000).toISOString(),
    })
  }

  console.log('\u2713 Пациент 2: Петров Дима (острый, ребёнок)')
}

// ═══════════════════════════════════════════════════════════════
// ПАЦИЕНТ 3: Новый пациент без приёмов
// ═══════════════════════════════════════════════════════════════
await sb.from('patients').insert({
  doctor_id: doctorId,
  name: 'Козлова Анна Павловна',
  birth_date: '1991-11-08',
  phone: '+7 (925) 111-22-33',
  email: 'demo2@example.com',
  notes: '\u26a0\ufe0f Тестовый пациент. Записалась через сайт, ещё не была на приёме.',
  first_visit_date: daysAgo(0),
})
console.log('\u2713 Пациент 3: Козлова (новый, без приёмов)')

console.log('\nГотово! 3 демо-пациента созданы.')
