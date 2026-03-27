'use server'

import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/server-utils'
import { redirect } from 'next/navigation'
import { randomUUID } from 'crypto'
import { z } from 'zod'
import Anthropic from '@anthropic-ai/sdk'

// --- Валидация ---

const createSchema = z.object({
  patientId: z.string().uuid(),
})

const submitSchema = z.object({
  token: z.string().min(10).max(100),
  answers: z.record(z.string(), z.string().max(5000)),
})

// --- Actions ---

/**
 * Создать AI-анкету — Sonnet генерирует вопросы на основе истории пациента
 */
export async function createAIIntakeLink(patientId: string): Promise<string> {
  createSchema.parse({ patientId })
  const { userId } = await requireAuth()

  // Получить данные пациента
  const patient = await prisma.patient.findFirst({
    where: { id: patientId, doctorId: userId },
    select: { id: true, name: true, birthDate: true, gender: true, constitutionalType: true, notes: true },
  })
  if (!patient) throw new Error('Patient not found')

  // Получить последние консультации для контекста
  const consultations = await prisma.consultation.findMany({
    where: { patientId, doctorId: userId, status: { not: 'cancelled' } },
    select: { date: true, notes: true, complaints: true, remedy: true, potency: true, type: true, reactionToPrevious: true },
    orderBy: { date: 'desc' },
    take: 5,
  })

  // Получить последнюю обычную анкету если есть
  const lastIntake = await prisma.intakeForm.findFirst({
    where: { patientId, status: 'completed' },
    select: { answers: true },
    orderBy: { completedAt: 'desc' },
  })

  // Сгенерировать вопросы через Sonnet
  const patientForAI = {
    name: patient.name,
    birth_date: patient.birthDate,
    gender: patient.gender,
    constitutional_type: patient.constitutionalType,
    notes: patient.notes,
  }
  const consultationsForAI = consultations.map(c => ({
    date: c.date ?? '',
    notes: c.notes ?? '',
    complaints: c.complaints ?? '',
    remedy: c.remedy,
    potency: c.potency,
    type: c.type,
    reaction_to_previous: c.reactionToPrevious,
  }))
  const questions = await generateAIQuestions(patientForAI, consultationsForAI, lastIntake?.answers as Record<string, string> | null)

  const token = randomUUID().replace(/-/g, '')
  const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000) // 72 часа

  await prisma.aiIntakeForm.create({
    data: {
      patientId,
      doctorId: userId,
      token,
      questionsJson: questions,
      status: 'pending',
      expiresAt,
    },
  })

  return token
}

/**
 * Пациент отправляет заполненную AI-анкету
 */
export async function submitAIIntake(token: string, answers: Record<string, string>): Promise<void> {
  submitSchema.parse({ token, answers })

  // Публичная форма — без auth
  const intake = await prisma.aiIntakeForm.findUnique({
    where: { token },
    select: { id: true, status: true, expiresAt: true },
  })

  if (!intake) return
  if (intake.status !== 'pending') return
  if (intake.expiresAt && new Date(intake.expiresAt) < new Date()) return

  await prisma.aiIntakeForm.update({
    where: { id: intake.id, status: 'pending' },
    data: {
      answersJson: answers,
      status: 'completed',
      completedAt: new Date(),
    },
  })
}

/**
 * Получить AI-анкету по токену (для страницы заполнения)
 */
export async function getAIIntakeByToken(token: string) {
  const data = await prisma.aiIntakeForm.findUnique({
    where: { token },
    select: { questionsJson: true, status: true, expiresAt: true, patientId: true },
  })
  return data
}

// --- Генерация вопросов ---

type AIQuestion = {
  key: string
  label: string
  type: 'textarea' | 'text' | 'chips' | 'chips-multi' | 'scale'
  options?: string[]
  hint?: string
  required?: boolean
}

type AIStep = {
  title: string
  subtitle: string
  fields: AIQuestion[]
}

async function generateAIQuestions(
  patient: { name: string; birth_date: string | null; gender: string | null; constitutional_type: string | null; notes: string | null },
  consultations: { date: string; notes: string; complaints: string; remedy: string | null; potency: string | null; type: string; reaction_to_previous: string | null }[],
  lastIntakeAnswers: Record<string, string> | null,
): Promise<AIStep[]> {
  const context = buildPatientContext(patient, consultations, lastIntakeAnswers)

  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })
    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 3000,
      system: `Ты — опытный гомеопат, который готовит персональную анкету для повторного визита пациента.

На основе истории болезни и предыдущих назначений сгенерируй 3-5 шагов анкеты с вопросами, которые:
1. Уточняют реакцию на предыдущее назначение (если было)
2. Отслеживают динамику известных симптомов
3. Выявляют новые симптомы или изменения
4. Задают целенаправленные вопросы по конкретным модальностям

Верни ТОЛЬКО JSON массив шагов (без обёрток):
[
  {
    "title": "Название шага",
    "subtitle": "Пояснение для пациента простым языком",
    "fields": [
      {
        "key": "уникальный_ключ",
        "label": "Вопрос для пациента (простым языком, без мед. терминов)",
        "type": "textarea|text|chips|chips-multi|scale",
        "options": ["вариант1", "вариант2"],
        "hint": "Подсказка почему это важно",
        "required": true/false
      }
    ]
  }
]

Правила:
- Пиши вопросы простым русским языком, как будто говоришь с пациентом лично
- Используй chips для вопросов с вариантами (3-6 вариантов)
- Используй chips-multi когда можно выбрать несколько
- textarea для развёрнутых ответов
- scale для оценки интенсивности (1-10)
- Первый шаг — всегда про реакцию на лечение (если было назначение)
- Последний шаг — общее самочувствие и настроение
- Максимум 4-5 полей на шаг
- key — латиницей, snake_case`,
      messages: [{ role: 'user', content: context }],
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : '[]'
    const jsonStr = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim()
    const steps = JSON.parse(jsonStr) as AIStep[]

    // Валидация структуры
    if (!Array.isArray(steps) || steps.length === 0) {
      return getFallbackSteps()
    }

    return steps
  } catch {
    return getFallbackSteps()
  }
}

function buildPatientContext(
  patient: { name: string; birth_date: string | null; gender: string | null; constitutional_type: string | null; notes: string | null },
  consultations: { date: string; notes: string; complaints: string; remedy: string | null; potency: string | null; type: string; reaction_to_previous: string | null }[],
  lastIntakeAnswers: Record<string, string> | null,
): string {
  const lines: string[] = []
  lines.push(`Пациент: ${patient.name}`)
  if (patient.birth_date) lines.push(`Дата рождения: ${patient.birth_date}`)
  if (patient.gender) lines.push(`Пол: ${patient.gender === 'male' ? 'мужской' : patient.gender === 'female' ? 'женский' : 'другой'}`)
  if (patient.constitutional_type) lines.push(`Конституциональный тип: ${patient.constitutional_type}`)
  if (patient.notes) lines.push(`Заметки врача: ${patient.notes}`)

  if (consultations.length > 0) {
    lines.push('\n--- ИСТОРИЯ КОНСУЛЬТАЦИЙ ---')
    for (const c of consultations) {
      lines.push(`\nДата: ${c.date} (${c.type})`)
      if (c.complaints) lines.push(`Жалобы: ${c.complaints}`)
      if (c.notes) lines.push(`Заметки: ${c.notes.slice(0, 500)}`)
      if (c.remedy) lines.push(`Назначение: ${c.remedy} ${c.potency ?? ''}`)
      if (c.reaction_to_previous) lines.push(`Реакция: ${c.reaction_to_previous}`)
    }
  }

  if (lastIntakeAnswers) {
    lines.push('\n--- ПРЕДЫДУЩАЯ АНКЕТА ---')
    for (const [key, val] of Object.entries(lastIntakeAnswers)) {
      if (val && val.trim()) lines.push(`${key}: ${val.slice(0, 300)}`)
    }
  }

  return lines.join('\n')
}

// Fallback если Sonnet недоступен
function getFallbackSteps(): AIStep[] {
  return [
    {
      title: 'Реакция на лечение',
      subtitle: 'Расскажите, как вы себя чувствовали после последнего визита',
      fields: [
        { key: 'reaction_general', label: 'Как в целом изменилось ваше состояние?', type: 'chips', options: ['Значительно лучше', 'Немного лучше', 'Без изменений', 'Немного хуже', 'Значительно хуже'], required: true },
        { key: 'reaction_details', label: 'Опишите подробнее что изменилось', type: 'textarea', hint: 'Какие симптомы ушли, какие остались, появились ли новые' },
        { key: 'reaction_timing', label: 'Когда вы заметили изменения?', type: 'text' },
      ],
    },
    {
      title: 'Текущие жалобы',
      subtitle: 'Что беспокоит вас сейчас',
      fields: [
        { key: 'current_complaints', label: 'Что вас беспокоит больше всего прямо сейчас?', type: 'textarea', required: true },
        { key: 'new_symptoms', label: 'Появились ли новые симптомы?', type: 'textarea' },
        { key: 'intensity', label: 'Насколько это мешает вам жить?', type: 'scale' },
      ],
    },
    {
      title: 'Общее состояние',
      subtitle: 'Ваше самочувствие в целом',
      fields: [
        { key: 'sleep', label: 'Как вы спите?', type: 'chips', options: ['Хорошо', 'Нормально', 'Трудно засыпаю', 'Просыпаюсь ночью', 'Плохо'] },
        { key: 'energy', label: 'Уровень энергии', type: 'chips', options: ['Отличный', 'Хороший', 'Средний', 'Низкий', 'Очень низкий'] },
        { key: 'mood', label: 'Эмоциональное состояние', type: 'chips', options: ['Спокойный', 'Тревожный', 'Раздражительный', 'Грустный', 'Переменчивый'] },
        { key: 'additional', label: 'Что ещё хотите добавить?', type: 'textarea' },
      ],
    },
  ]
}
