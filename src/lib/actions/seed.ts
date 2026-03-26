'use server'

import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/server-utils'
import { randomUUID } from 'crypto'

// Создаёт демо-пациентов для нового аккаунта, чтобы врач сразу видел функционал
export async function seedDemoData(): Promise<void> {
  const { userId } = await requireAuth()

  // Защита от повторного вызова — если уже есть пациенты, ничего не делаем
  const count = await prisma.patient.count({
    where: { doctorId: userId },
  })

  if (count > 0) return

  const doctorId = userId

  const daysAgo = (n: number) => {
    const d = new Date()
    d.setDate(d.getDate() - n)
    return d.toISOString().split('T')[0]
  }

  const daysFromNow = (n: number) => {
    const d = new Date()
    d.setDate(d.getDate() + n)
    return d.toISOString().split('T')[0]
  }

  const scheduledAt = (daysOffset: number, hour: number) => {
    const d = new Date()
    d.setDate(d.getDate() + daysOffset)
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), hour - 3, 0, 0))
  }

  // ─── Пациент 1: Иванова Мария Сергеевна ───────────────────────────────────
  // Демонстрирует: первичная анкета, 2 хронические консультации, острый случай,
  // анкета острого случая, follow-up с ответами, запланированный приём
  const p1 = await prisma.patient.create({
    data: {
      doctorId,
      name: 'Иванова Мария Сергеевна',
      birthDate: '1984-03-15',
      phone: '+7 (916) 234-56-78',
      email: 'ivanova.ms@example.com',
      constitutionalType: 'Natrum Muriaticum',
      isDemo: true,
      paidSessions: 99,
      notes: '⚠️ Демо-пациент\nХроническая мигрень с аурой. Высокая эмоциональная чувствительность. Предпочитает тихую, спокойную обстановку на приёме.',
      firstVisitDate: daysAgo(62),
    },
    select: { id: true },
  })

  // Первичная анкета
  const intake1Token = randomUUID().replace(/-/g, '')
  await prisma.intakeForm.create({
    data: {
      token: intake1Token,
      doctorId,
      patientId: p1.id,
      patientName: 'Иванова Мария Сергеевна',
      type: 'primary',
      status: 'completed',
      completedAt: new Date(Date.now() - 62 * 86400000),
      expiresAt: new Date(Date.now() + 365 * 86400000),
      answers: {
        patient_name: 'Иванова Мария Сергеевна',
        patient_birth_date: '1984-03-15',
        patient_phone: '+7 (916) 234-56-78',
        patient_email: 'ivanova.ms@example.com',
        chief_complaint: 'Мигрень с аурой. Головные боли начинаются с визуальных нарушений — "мерцающая зигзагообразная линия" в поле зрения, затем сильная пульсирующая боль в правой половине головы. Тошнота, непереносимость яркого света и резких запахов.',
        duration: 'Около 8 лет. Усилилось после рождения второго ребёнка 4 года назад.',
        cause: 'Стресс, хроническое недосыпание, гормональные изменения после родов.',
        sensation: 'Пульсирующая, как будто голову сдавливают обручем. Иногда жгучая боль за глазами.',
        location: 'Правая половина головы, затылок, за правым глазом.',
        radiation: 'Отдаёт в шею и правое плечо.',
        intensity: '8',
        worse_from: 'Яркий свет, шум, резкие запахи, смена погоды, менструальный цикл, недосып, стрессовые ситуации на работе.',
        better_from: 'Тёмная тихая комната, прохладный компресс на голову, сон, давление на болезненную точку.',
        time_worse: 'Обычно начинается утром, при пробуждении. Нарастает в течение дня.',
        thermal: 'Обычно жарко',
        thirst: 'Пью умеренно',
        perspiration: 'Повышенная',
        energy: 'Утром тяжело вставать. Пик активности во второй половине дня. К вечеру быстро устаю.',
        sleep: 'Плохо засыпаю, мысли не отпускают. Просыпаюсь 2-3 раза ночью. Утром чувствую себя разбитой даже после 8 часов сна.',
        dreams: 'Снятся тревожные сны — погоня, опоздание на важное мероприятие, потеря детей в толпе.',
        food_desires: 'Сладкое, особенно шоколад. Солёное. Молочные продукты.',
        food_aversions: 'Жирное мясо, яйца (вызывают тяжесть).',
        emotional: 'Постоянная фоновая тревога. Раздражительность, которую стараюсь скрывать. Плаксивость перед менструацией.',
        stress: 'Ухожу в себя, замыкаюсь. Иногда плачу в одиночестве. Стараюсь держать всё под контролем.',
        fears: 'Страх за детей (что заболеют, что случится что-то плохое). Страх не справиться с работой и семьёй одновременно.',
        past_illnesses: 'Ветрянка в детстве. Тонзиллит частый (удалены миндалины в 12 лет). Кесарево сечение 2020 г.',
        medications: 'Суматриптан — при приступах. Магний Б6 — постоянно.',
        allergies: 'Поллиноз (берёза, злаки) — насморк, зуд глаз весной.',
        family_history: 'Мама — гипертония, мигрень. Бабушка по маме — сахарный диабет 2 типа.',
      },
    },
  })

  // Консультация 1 — 60 дней назад (структурированная)
  const c1p1 = await prisma.consultation.create({
    data: {
      patientId: p1.id,
      doctorId,
      date: daysAgo(60),
      status: 'completed',
      type: 'chronic',
      complaints: 'Мигрень с аурой, частота 3-4 раза в месяц. Аура: зигзагообразные мерцающие линии справа, 20-30 мин. Затем пульсирующая боль в правой половине головы, тошнота, фото- и фонофобия. Приступ 12-24 часа.',
      observations: `МОДАЛЬНОСТИ
Хуже: яркий свет, запахи, шум, смена погоды (к дождю), перед менструацией, стресс.
Лучше: тёмная комната, прохлада, давление на болезненную точку, сон.

ОБЩЕЕ СОСТОЯНИЕ
Термальность: жаркая, не переносит духоту.
Жажда: умеренная, прохладное питьё.
Пот: повышенный, ночной.
Сон: поверхностный, долго не засыпает, тревожные сны.

ПСИХОЭМОЦИОНАЛЬНОЕ
Контроль, сдержанность. Скрывает эмоции. Плаксивость наедине. Тревога за детей. «Никто не понимает».`,
      notes: `ДИФФЕРЕНЦИАЛЬНАЯ ДИАГНОСТИКА
Natrum Mur vs. Sepia vs. Lachesis
— Закрытость → Nat-m
— Жаркая → Nat-m
— Мигрень с аурой, правосторонняя → Nat-m, Sepia
— Тревога, плохой сон → Nat-m

⚠️ Тестовый пациент — демо-данные`,
      recommendations: 'Bryonia 30C при начале приступа. Повторить через 2 часа при необходимости. Повторный приём через 4 недели — оценить конституциональную картину.',
      remedy: 'Bryonia',
      potency: '30C',
      pellets: 5,
      dosage: '5 гранул под язык при начале приступа, можно повторить через 2 часа',
    },
    select: { id: true },
  })

  await prisma.followup.create({
    data: {
      consultationId: c1p1.id,
      patientId: p1.id,
      token: randomUUID().replace(/-/g, ''),
      status: 'better',
      comment: 'Bryonia помогала при приступах — боль отступала быстрее, тошноты стало меньше. Сами приступы стали чуть реже, но я не уверена, случайность ли это. В целом чувствую себя лучше.',
      sentAt: new Date(Date.now() - 45 * 86400000),
      respondedAt: new Date(Date.now() - 40 * 86400000),
    },
  })

  // Консультация 2 — 30 дней назад (структурированная)
  const c2p1 = await prisma.consultation.create({
    data: {
      patientId: p1.id,
      doctorId,
      date: daysAgo(30),
      status: 'completed',
      type: 'chronic',
      complaints: 'Мигрени стали реже — 2 за месяц (раньше 3-4). Приступы короче. Эмоционально — "что-то отпустило".',
      observations: `ДИНАМИКА
Bryonia: боль за 4-5ч вместо 12-18. Тошнота меньше. Позитивная динамика.

НОВЫЕ НАБЛЮДЕНИЯ
— Хуже от утешения — не любит, когда жалеют
— Хуже от солнца/жары (пляж → мигрень)
— Горе: смерть отца 5 лет назад, «не позволила горевать»
— Желание соли, шоколада
— Мигрени чаще во 2-й день менструации

КОНСТИТУЦИОНАЛЬНАЯ КАРТИНА
Nat-m выражен: закрытость, горе внутри, хуже от утешения и жары, тяга к соли.`,
      notes: `Впервые плакала на приёме. Рассказала о напряжении с мужем — «держу всё в себе, показать боль = слабость».

⚠️ Тестовый пациент — демо-данные`,
      recommendations: 'Natrum Muriaticum 200C — одна доза. Наблюдение 4-6 недель. Ожидаю улучшение мигреней + эмоциональное раскрытие.',
      remedy: 'Natrum Muriaticum',
      potency: '200C',
      pellets: 1,
      dosage: '1 гранула под язык однократно, вечером перед сном',
      reactionToPrevious: 'Bryonia 30C — хорошая реакция. Приступы короче и реже. Тошнота значительно меньше.',
    },
    select: { id: true },
  })

  await prisma.followup.create({
    data: {
      consultationId: c2p1.id,
      patientId: p1.id,
      token: randomUUID().replace(/-/g, ''),
      status: 'better',
      comment: 'Прошло 3 недели. Мигреней не было совсем! Это невероятно для меня. Общее состояние — как будто что-то "отпустило". Сплю лучше, тревога меньше. Эмоционально стало легче.',
      sentAt: new Date(Date.now() - 14 * 86400000),
      respondedAt: new Date(Date.now() - 10 * 86400000),
    },
  })

  // Острый случай — 8 дней назад (демонстрирует острые консультации и анкету острого случая)
  const acuteIntakeToken = randomUUID().replace(/-/g, '')
  await prisma.intakeForm.create({
    data: {
      token: acuteIntakeToken,
      doctorId,
      patientId: p1.id,
      patientName: 'Иванова Мария Сергеевна',
      type: 'acute',
      status: 'completed',
      completedAt: new Date(Date.now() - 8 * 86400000),
      expiresAt: new Date(Date.now() + 365 * 86400000),
      answers: {
        patient_name: 'Иванова Мария Сергеевна',
        chief_complaint: 'Острый приступ мигрени. Началось 2 часа назад. Аура уже прошла, сейчас сильная пульсирующая боль в правом виске. Тошнота, не могу смотреть на свет.',
        onset: '2 часа назад, резко. Сначала мерцание в глазах, потом нарастающая боль.',
        severity: '9',
        sensation: 'Пульсирует в такт сердцу. Чувство, как будто череп сейчас лопнет.',
        location: 'Правый висок, распространяется на весь правый бок головы.',
        worse_from: 'Любое движение, свет, звуки, запахи.',
        better_from: 'Лежать неподвижно в темноте, прохладный компресс.',
        accompanying: 'Тошнота сильная, была однократная рвота. Фотофобия, фонофобия.',
        tried: 'Суматриптан уже выпила, но ещё не подействовал. Bryonia закончилась.',
      },
    },
  })

  const acuteC1p1 = await prisma.consultation.create({
    data: {
      patientId: p1.id,
      doctorId,
      date: daysAgo(8),
      status: 'completed',
      type: 'acute',
      notes: `ОСТРЫЙ СЛУЧАЙ — Иванова М.С.

ЖАЛОБЫ
Острый приступ мигрени, 2 часа. Аура прошла. Сильная пульсирующая боль правый висок → весь правый бок. Тошнота, однократная рвота. Полная фото- и фонофобия.

ВЫБОР СРЕДСТВА
Bryonia закончилась. На фоне Natrum Muriaticum 200C (принятой 3 недели назад) — применить Spigelia, которая показана при:
— Правосторонняя невралгическая/мигренозная боль
— Боль пульсирующая, как удары молота
— Хуже от малейшего движения
— Сопровождается тошнотой
— Хуже от солнечного света

НАЗНАЧЕНИЕ
Spigelia 30C — при приступе.`,
      remedy: 'Spigelia',
      potency: '30C',
      pellets: 5,
      dosage: '5 гранул под язык, каждый час до облегчения, максимум 3 приёма',
    },
    select: { id: true },
  })

  await prisma.followup.create({
    data: {
      consultationId: acuteC1p1.id,
      patientId: p1.id,
      token: randomUUID().replace(/-/g, ''),
      status: 'better',
      comment: 'Spigelia сработала! Через час боль стала утихать, через 3 часа прошла полностью. Буду держать её под рукой на будущее.',
      sentAt: new Date(Date.now() - 6 * 86400000),
      respondedAt: new Date(Date.now() - 5 * 86400000),
    },
  })

  // Запланированный приём через 5 дней
  await prisma.consultation.create({
    data: {
      patientId: p1.id,
      doctorId,
      date: daysFromNow(5),
      scheduledAt: scheduledAt(5, 11),
      status: 'scheduled',
      type: 'chronic',
      notes: '',
    },
  })

  // Пациенты 2-5 удалены — оставлен один демо-пациент для чистого onboarding
}
