/**
 * Пилот: Sonnet-верификатор на 5 промахах full-flow.
 * Проверяем: может ли второй проход Sonnet исправить ошибки парсинга.
 */
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

const VERIFIER_PROMPT = `Ты — опытнейший гомеопат-консультант. Тебе дан текст пациента и 5 средств-кандидатов от реперторизации.

Твоя задача: переранжировать кандидатов по степени соответствия пациенту.

Для каждого средства оцени:
1. Совпадение конституционального типа (habitus, темперамент)
2. Покрытие keynotes (есть ли sine qua non данного средства в тексте?)
3. Этиология (причина болезни совпадает?)
4. Противоречия (есть ли в тексте что-то НЕСОВМЕСТИМОЕ с этим средством?)

Верни JSON массив из 5 средств в новом порядке (лучшее первое):
[{"remedy": "...", "score": 0-100, "reasoning": "кратко почему"}]

ВАЖНО:
- НЕ добавляй новые средства. Только переставляй данные 5.
- Основывайся на ТЕКСТЕ пациента, не на общих знаниях.
- Если не уверен — оставь порядок как есть.`

type PilotCase = {
  id: number
  text: string
  expected: string
  top5: string[]
}

const CASES: PilotCase[] = [
  {
    id: 2, expected: 'calc',
    top5: ['Carc.', 'Calc.', 'Sil.', 'Psor.', 'Merc.'],
    text: 'Девочка 3 года. Пухленькая, крупная голова. Голова потеет ночью — подушка насквозь мокрая. Ноги холодные и влажные. Зубы режутся поздно. Боится собак. Очень упрямая. Мёрзнет постоянно. От пота кислый запах.',
  },
  {
    id: 16, expected: 'tub',
    top5: ['Iod.', 'Calc.', 'Ars.', 'Nat-c.', 'Tub.'],
    text: 'Подросток 14 лет. Худой, высокий, быстро устаёт. Частые простуды, увеличены лимфоузлы. Мечтает путешествовать — не может сидеть на месте. Потеет ночью. Любит ветчину и копчёное. Бабушка болела туберкулёзом.',
  },
  {
    id: 20, expected: 'con',
    top5: ['Carc.', 'Con.', 'Nat-c.', 'Cocc.', 'Bar-c.'],
    text: 'Мужчина 72 года. Живёт один, жена умерла. Головокружение — хуже лёжа и поворачивая голову. Слабость нарастающая. Уплотнения в молочных железах. Ночная потливость. Медлительный, тяжело думать.',
  },
  {
    id: 22, expected: 'gels',
    top5: ['Cocc.', 'Gels.', 'Verat.', 'Nat-c.', 'Ars.'],
    text: 'Студент 19 лет. Перед экзаменом — полное оцепенение. Веки тяжёлые, еле открывает. Руки дрожат. Пить не хочет. Понос от волнения. Ноги ватные — подкашиваются.',
  },
  {
    id: 29, expected: 'hep',
    top5: ['Sil.', 'Merc.', 'Hep.', 'Nit-ac.', 'Psor.'],
    text: 'Мальчик 4 года. Гнойный отит — выделения с запахом старого сыра. Любой сквозняк — и сразу хуже. Кутается. Раздражительный до крайности. Занозы нагнаиваются моментально. Не переносит когда трогают.',
  },
]

async function main() {
  console.log('=== Пилот верификатора (5 промахов) ===\n')

  for (const c of CASES) {
    const userMessage = `Текст пациента:
"${c.text}"

Кандидаты от реперторизации (в текущем порядке):
1. ${c.top5[0]}
2. ${c.top5[1]}
3. ${c.top5[2]}
4. ${c.top5[3]}
5. ${c.top5[4]}`

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 800,
      temperature: 0.1,
      system: VERIFIER_PROMPT,
      messages: [{ role: 'user', content: userMessage }],
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : ''
    const jsonStr = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim()

    let newOrder: { remedy: string; score: number; reasoning: string }[] = []
    try {
      newOrder = JSON.parse(jsonStr)
    } catch {
      console.log(`#${c.id}: PARSE ERROR`)
      console.log(text.substring(0, 300))
      continue
    }

    const norm = (s: string) => s.toLowerCase().replace(/\.$/, '')
    const newTop1 = norm(newOrder[0]?.remedy ?? '')
    const wasTop1 = norm(c.top5[0])
    const isFixed = newTop1 === c.expected
    const wasBroken = wasTop1 !== c.expected

    console.log(`#${c.id} expected=${c.expected}`)
    console.log(`  БЫЛО:  ${c.top5.join(', ')}`)
    console.log(`  СТАЛО: ${newOrder.map(r => r.remedy).join(', ')}`)
    console.log(`  ${isFixed ? '✅ FIXED' : wasBroken ? '❌ НЕ ИСПРАВЛЕН' : '✅ НЕ СЛОМАН'} (top1: ${wasTop1} → ${newTop1})`)
    console.log(`  Reasoning: ${newOrder[0]?.reasoning ?? '?'}`)
    console.log()

    await new Promise(r => setTimeout(r, 500))
  }
}

main().catch(console.error)
