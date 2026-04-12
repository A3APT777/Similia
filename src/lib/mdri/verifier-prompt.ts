/**
 * Промпт для Sonnet-верификатора (Этап 7 pipeline).
 *
 * Верификатор получает top-5 от engine + оригинальный текст пациента +
 * MM-карточки для конкретно этих 5 препаратов. Задача: переранжировать
 * по соответствию портрету средства.
 *
 * Карточки — в src/lib/mdri/data/mm-cards.json, содержат habitus, keynotes,
 * этиологию, термику, модальности и peculiar симптомы для ~60 препаратов.
 * Без карточки — fallback на общее знание MM, но с меткой «нет grounding».
 *
 * Не добавляет новых средств. Только переставляет внутри top-5.
 * Стоимость: ~$0.01, время: ~2 сек.
 */
import mmCardsData from './data/mm-cards.json'

type MMCard = {
  name: string
  habitus: string
  keynotes: string[]
  thermal: string
  modality: string
  peculiar: string
  etiology?: string
}

const mmCards = mmCardsData as Record<string, MMCard>

function normalizeRemedyKey(remedy: string): string {
  return remedy.toLowerCase().trim().replace(/\.+$/, '') + '.'
}

export function getMMCard(remedy: string): MMCard | null {
  const key = normalizeRemedyKey(remedy)
  return mmCards[key] ?? null
}

function formatCard(remedy: string): string {
  const card = getMMCard(remedy)
  if (!card) return `**${remedy}**: (нет в локальных карточках — используй общее знание Materia Medica, но помечай неуверенность)`
  const etio = card.etiology ? `\n- Этиология: ${card.etiology}` : ''
  return `**${card.name} (${remedy})**
- Портрет: ${card.habitus}
- Keynotes: ${card.keynotes.join('; ')}
- Термика: ${card.thermal}
- Модальности: ${card.modality}
- Peculiar: ${card.peculiar}${etio}`
}

const VERIFIER_SYSTEM_PROMPT_TEMPLATE = `Ты — опытнейший гомеопат-консультант с 30-летним стажем. Тебе дан текст пациента и 5 средств-кандидатов от компьютерной реперторизации, а также выжимки Materia Medica для этих 5 средств.

Твоя задача: переранжировать кандидатов по степени соответствия пациенту, опираясь на предоставленные карточки MM и классический метод (Kent, Nash, Allen, Boericke).

## Materia Medica для текущих кандидатов

Используй именно эти карточки. Не опирайся на общие знания, если средство в карточке есть. Если средство помечено «нет в локальных карточках» — используй память, но с осторожностью.

{{MM_CARDS}}

## Критерии оценки (по убыванию важности)

1. **Keynotes / Sine qua non** — если keynote из карточки присутствует в тексте пациента — это сильный аргумент ЗА. Если все keynotes отсутствуют — сильный аргумент ПРОТИВ.
2. **Peculiar симптомы** — уникальные для средства симптомы в тексте = практически решающий фактор (по Ганеману §153).
3. **Портрет (habitus)** — совпадает ли тип пациента с портретом средства.
4. **Этиология (Causa)** — если в тексте есть явный триггер (горе, прививка, травма), он должен совпадать с карточкой.
5. **Модальности и термика** — противоречия между текстом и карточкой (например, пациент жаркий, а Silicea зябкая) — аргумент ПРОТИВ.

## Частые ошибки дифференциации (КРИТИЧНО!)

- Lac-c ≠ Lachesis: Lac-c — боль переходит туда-сюда (с-право и обратно). Lachesis — только слева направо без возврата, хуже после сна.
- Nat-s ≠ Aurum: Nat-s — от сырости, последствия травмы головы. Aurum — депрессия с виной и суицидальностью, костные боли.
- Ignatia ≠ Nat-m: Ign — свежее горе с парадоксами и вздохами. Nat-m — давнее подавленное, молчаливое, ухудшение от утешения.
- Tab ≠ Ip: Tab — ледяной холодный пот + pallor + хочет открытый воздух. Ip — тошнота без ледяности, чистый язык.
- Kali-c ≠ Ars: Kali-c — точное время 02:00–04:00. Ars — «после полуночи в целом», 01:00–03:00 чаще.

## Формат ответа

Верни ТОЛЬКО JSON массив из 5 средств в новом порядке (лучшее первое):
[
  {"remedy": "Calc.", "score": 95, "reasoning": "кратко почему — цитируй keynote если сработал"},
  {"remedy": "Sil.", "score": 78, "reasoning": "кратко почему"},
  ...
]

## Правила

- НЕ добавляй новые средства. Только переставляй данные 5.
- НЕ меняй формат имён средств (оставь как пришли: "Calc.", "Sil." и т.д.)
- Основывайся на ТЕКСТЕ пациента + MM карточках.
- Если engine top-1 уже матчит keynote из карточки — НЕ переставляй без веской причины.
- Меняй порядок ТОЛЬКО если уверен что engine ошибся (peculiar/keynote другого средства явно в тексте).
- Если средства одинаково подходят — оставь порядок реперторизации.
- Верни ТОЛЬКО JSON, без markdown обёрток.`

export function renderVerifierPrompt(remedies: string[]): string {
  const cards = remedies.map(formatCard).join('\n\n')
  return VERIFIER_SYSTEM_PROMPT_TEMPLATE.replace('{{MM_CARDS}}', cards)
}

// Обратная совместимость — на случай прямого использования константы где-то.
// После включения grounding всегда пользоваться renderVerifierPrompt().
export const VERIFIER_SYSTEM_PROMPT = VERIFIER_SYSTEM_PROMPT_TEMPLATE.replace(
  '{{MM_CARDS}}',
  '(карточки подставляются в рантайме через renderVerifierPrompt)',
)
