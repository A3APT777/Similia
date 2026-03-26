/**
 * Full-flow тест: русский текст → Sonnet parsing → keyword fallback → engine → результат
 * 50 кейсов, НЕ пересекаются с few-shot примерами в промпте.
 * Измеряет реальный parsing coverage и end-to-end accuracy.
 */
import Anthropic from '@anthropic-ai/sdk'
import { readFileSync } from 'fs'
import { join } from 'path'
import { PARSING_SYSTEM_PROMPT } from '../src/lib/mdri/parsing-prompt'
import { mergeWithFallback } from '../src/lib/mdri/product-layer'
import { analyzePipeline, buildIndices } from '../src/lib/mdri/engine'
import type { MDRIData } from '../src/lib/mdri/engine'
import type {
  MDRISymptom, MDRIModality, MDRIPatientProfile,
  MDRIRepertoryRubric, MDRIConstellationData, MDRIPolarityData,
  MDRIClinicalData, MDRISymptomCategory,
} from '../src/lib/mdri/types'
import { DEFAULT_PROFILE } from '../src/lib/mdri/types'

// === Загрузка данных ===
function loadData(): MDRIData {
  const dataDir = join(process.cwd(), 'src', 'lib', 'mdri', 'data')
  const repertoryRaw = JSON.parse(readFileSync(join(dataDir, 'repertory.json'), 'utf-8'))
  const constellationsRaw = JSON.parse(readFileSync(join(dataDir, 'constellations.json'), 'utf-8'))
  const polaritiesRaw = JSON.parse(readFileSync(join(dataDir, 'polarities.json'), 'utf-8'))
  const clinicalRaw = JSON.parse(readFileSync(join(dataDir, 'clinical.json'), 'utf-8'))

  const repertory: MDRIRepertoryRubric[] = repertoryRaw.map((r: any) => ({
    rubric: r.fullpath, chapter: r.chapter, remedies: r.remedies,
  }))
  const constellations: Record<string, MDRIConstellationData> = {}
  for (const c of constellationsRaw) {
    constellations[c.remedy] = { name: c.name, clusters: c.clusters, sine_qua_non: c.sine_qua_non, excluders: c.excluders }
  }
  const polarities: Record<string, MDRIPolarityData> = {}
  for (const p of polaritiesRaw) { polarities[p.remedy] = p.polarities }
  const clinicalData: MDRIClinicalData = { thermal_contradictions: {}, consistency_groups: [] }

  const indices = buildIndices(repertory, constellations)
  return { repertory, constellations, polarities, relationships: {}, clinicalData, ...indices }
}

// === Sonnet parsing ===
async function parseText(client: Anthropic, text: string) {
  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2000,
    temperature: 0.2,
    system: PARSING_SYSTEM_PROMPT,
    messages: [{ role: 'user', content: text }],
  })
  const responseText = response.content[0].type === 'text' ? response.content[0].text : '{}'
  const jsonStr = responseText.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim()
  try {
    const parsed = JSON.parse(jsonStr)
    return {
      symptoms: (parsed.symptoms ?? []).map((s: any) => ({
        rubric: String(s.rubric ?? ''),
        category: (['mental', 'general', 'particular'].includes(s.category) ? s.category : 'particular') as MDRISymptomCategory,
        present: s.present !== false,
        weight: Math.min(3, Math.max(1, Number(s.weight) || 2)) as 1 | 2 | 3,
      })),
      modalities: (parsed.modalities ?? []).map((m: any) => ({
        pairId: String(m.pairId ?? ''),
        value: m.value === 'amel' ? 'amel' as const : 'agg' as const,
      })),
      familyHistory: (parsed.familyHistory ?? []).map((f: any) => String(f)),
    }
  } catch {
    return { symptoms: [] as MDRISymptom[], modalities: [] as MDRIModality[], familyHistory: [] as string[] }
  }
}

// === 50 тестовых кейсов (русский текст) ===
// НЕ пересекаются с few-shot примерами в parsing-prompt.ts
type FullFlowCase = {
  id: number
  text: string
  expected: string
  name: string
}

const CASES: FullFlowCase[] = [
  // --- Полихресты (классические) ---
  { id: 1, expected: 'sulph', name: 'Sulphur: ленивый мыслитель',
    text: 'Мужчина 48 лет. Кожный зуд хуже от горячей воды. Горят подошвы по ночам — вытаскивает ноги из-под одеяла. Голод около 11 утра. Не любит мыться. Философствует на любую тему. Стоя долго не может.' },
  { id: 2, expected: 'calc', name: 'Calc: пухлый медленный',
    text: 'Девочка 3 года. Пухленькая, крупная голова. Голова потеет ночью — подушка насквозь мокрая. Ноги холодные и влажные. Зубы режутся поздно. Боится собак. Очень упрямая. Мёрзнет постоянно. От пота кислый запах.' },
  { id: 3, expected: 'lyc', name: 'Lyc: газы вечером',
    text: 'Мужчина 55 лет. Живот раздувается после пары ложек еды. Правый бок беспокоит. С 4 до 8 вечера хуже всего. Перед выступлениями трясётся от волнения. Дома командует. Любит горячее.' },
  { id: 4, expected: 'nat-m', name: 'Nat-m: молчаливое горе',
    text: 'Женщина 38 лет. Развелась 5 лет назад. При людях не плачет — только когда одна. Не выносит когда жалеют. Головные боли от солнца. Ест солёное. Похудела.' },
  { id: 5, expected: 'puls', name: 'Puls: изменчивая мягкая',
    text: 'Девочка 8 лет. Легко плачет, потом быстро отвлекается. Хочет чтобы мама была рядом. Нет жажды совсем. На свежем воздухе лучше. Жирное не переваривает. Боли блуждающие — то тут то там.' },
  { id: 6, expected: 'ars', name: 'Ars: тревожный педант',
    text: 'Мужчина 62 года. Уверен что серьёзно болен. Всё должно быть на своих местах. Не может лежать спокойно. Хуже после часа ночи. Очень мёрзнет. Жжение в желудке но грелка помогает. Пьёт по глоточку часто.' },
  { id: 7, expected: 'phos', name: 'Phos: открытый кровоточивый',
    text: 'Женщина 30 лет. Часто кровь из носа — яркая. Боится темноты, грозы и одиночества. Сочувственная. Пьёт холодную воду большими глотками. Жжение между лопатками. В сумерках хуже. Любит мороженое.' },
  { id: 8, expected: 'sep', name: 'Sepia: равнодушная к семье',
    text: 'Женщина 42 года. Ничего не чувствует к мужу и детям — пустота. Тянет вниз в области матки. Жёлтые пятна на щеках. Обожает уксус и лимон. От интенсивных танцев становится заметно лучше.' },
  { id: 9, expected: 'nux-v', name: 'Nux-v: раздражённый трудоголик',
    text: 'Мужчина 45 лет. Работает по 14 часов. Раздражается по мелочам. Запоры — тужится но безрезультатно. Утром хуже всего. Зябкий. Пьёт много кофе. Чувствителен к шуму. Просыпается в 3-4 утра и не может заснуть.' },
  { id: 10, expected: 'lach', name: 'Lach: менопауза слева',
    text: 'Женщина 53 года. Приливы жара. Жалобы больше слева. Не переносит тесное на шее — снимает шарф. Подозрительная, ревнивая. Болтливая — перескакивает с темы на тему. После сна хуже. Жаркая.' },

  // --- Острые ---
  { id: 11, expected: 'bell', name: 'Bell: внезапный жар',
    text: 'Ребёнок 5 лет. Температура 40 за час. Лицо ярко-красное, горячее. Зрачки расширены. Голова горячая, конечности холодные. Пульсирующая боль в голове. Бредит. От света и шума хуже.' },
  { id: 12, expected: 'bry', name: 'Bry: сухой с болью',
    text: 'Мужчина 50 лет. Пневмония. Любое движение усиливает боль в груди. Лежит на больном боку — так легче. Рот сухой. Жажда огромная — пьёт помногу и редко. Раздражительный, хочет покоя.' },
  { id: 13, expected: 'rhus-t', name: 'Rhus-t: ржавый замок',
    text: 'Женщина 58 лет. Артрит. Утром встать не может — всё скованное. Первые шаги мучительные, но через 10 минут ходьбы расходится. В сырую погоду хуже. Беспокойно ворочается ночью. Горячая ванна помогает.' },
  { id: 14, expected: 'acon', name: 'Acon: паника внезапная',
    text: 'Мужчина 40 лет. После выхода на мороз — резкий озноб, температура, сердцебиение. Страх смерти — уверен что умрёт. Лицо то красное то бледное. Всё началось внезапно ночью. Жажда холодной воды.' },
  { id: 15, expected: 'cham', name: 'Cham: невыносимый ребёнок',
    text: 'Ребёнок 10 месяцев. Режутся зубы. Кричит не переставая. Одна щека красная, другая бледная. Просит игрушку и тут же бросает. Успокаивается только когда носят на руках. Стул зелёный.' },

  // --- Нозоды ---
  { id: 16, expected: 'tub', name: 'Tub: путешественник',
    text: 'Подросток 14 лет. Худой, высокий, быстро устаёт. Частые простуды, увеличены лимфоузлы. Мечтает путешествовать — не может сидеть на месте. Потеет ночью. Любит ветчину и копчёное. Бабушка болела туберкулёзом.' },
  { id: 17, expected: 'psor', name: 'Psor: отчаявшийся грязнуля',
    text: 'Мужчина 60 лет. Зябкий до крайности — мёрзнет даже летом. Кожа грязноватая, зудит. Отчаялся — думает что никогда не поправится. Запах тела неприятный. Зимой хуже. Голод ночью.' },

  // --- Малые средства ---
  { id: 18, expected: 'staph', name: 'Staph: подавленная обида',
    text: 'Женщина 35 лет. Муж унижает, но молчит. Копит обиды внутри. Ячмени повторяются. Зубы чернеют и крошатся. Режущие боли в животе после обиды. Чувствительна к малейшему замечанию.' },
  { id: 19, expected: 'ign', name: 'Ign: свежее горе',
    text: 'Женщина 28 лет. Недавно рассталась с партнёром. Ком в горле. То смеётся то плачет. Вздохи постоянные. Хуже от утешения. Голод но не может есть. Головная боль как гвоздь в висок.' },
  { id: 20, expected: 'con', name: 'Con: одинокий старик',
    text: 'Мужчина 72 года. Живёт один, жена умерла. Головокружение — хуже лёжа и поворачивая голову. Слабость нарастающая. Уплотнения в молочных железах. Ночная потливость. Медлительный, тяжело думать.' },

  // --- Ощущения/Keynotes ---
  { id: 21, expected: 'arg-n', name: 'Arg-n: страх опоздать',
    text: 'Женщина 32 года. Перед собеседованием — паника, понос, дрожь. Кажется что не успеет. Хочет сладкого. Головокружение на высоте. Отрыжка. В закрытом помещении хуже.' },
  { id: 22, expected: 'gels', name: 'Gels: вялый от страха',
    text: 'Студент 19 лет. Перед экзаменом — полное оцепенение. Веки тяжёлые, еле открывает. Руки дрожат. Пить не хочет. Понос от волнения. Ноги ватные — подкашиваются.' },
  { id: 23, expected: 'kali-c', name: 'Kali-c: 2-4 утра',
    text: 'Женщина 65 лет. Просыпается в 2-3 ночи от тревоги. Сердцебиение. Колющие боли в груди. Отёки верхних век. Поясница болит — хуже сидя. Зябкая. Астма ночью. Педантичная, всё по правилам.' },
  { id: 24, expected: 'apis', name: 'Apis: отёк жалящий',
    text: 'Ребёнок 6 лет. Отёк горла после укуса. Жалящая колющая боль. Нет жажды. Тепло хуже — от горячей ванны отёк увеличился. Холодный компресс помогает. Кожа розоватая блестящая.' },
  { id: 25, expected: 'merc', name: 'Merc: влажный ночной',
    text: 'Мужчина 38 лет. Потеет ночью — постель мокрая. Слюнотечение на подушку. Дёсны рыхлые кровоточат. Запах изо рта металлический. Язык с отпечатками зубов. Ни жара ни холод не помогают.' },

  // --- Конституционные ---
  { id: 26, expected: 'sil', name: 'Sil: хрупкий упрямый',
    text: 'Мальчик 7 лет. Тонкий, бледный, выглядит хрупким. Но упрямый — если решил, не переубедить. Зябкий очень. Ноги потеют с запахом. Нагнаивается каждая царапина. Боится иголок.' },
  { id: 27, expected: 'graph', name: 'Graph: толстый с экземой',
    text: 'Женщина 50 лет. Полная, зябкая. Мокнущая экзема — из трещин сочится клейкая жидкость медового цвета. За ушами, на сгибах. Запоры — стул крупными сухими комками. Нерешительная.' },
  { id: 28, expected: 'caust', name: 'Caust: хриплый идеалист',
    text: 'Мужчина 55 лет. Осип — хрипота не проходит месяцами. Болеет за несправедливость — переживает за чужих людей. Артрит — хуже от сухого холодного ветра. Контрактуры пальцев. Непроизвольное мочеиспускание при кашле.' },
  { id: 29, expected: 'hep', name: 'Hep: чувствителен к холоду',
    text: 'Мальчик 4 года. Гнойный отит — выделения с запахом старого сыра. Любой сквозняк — и сразу хуже. Кутается. Раздражительный до крайности. Занозы нагнаиваются моментально. Не переносит когда трогают.' },
  { id: 30, expected: 'nit-ac', name: 'Nit-ac: занозы и трещины',
    text: 'Женщина 45 лет. Трещины в углах рта, анус — режущие боли как от осколка стекла. Бородавки. Мочится с сильным запахом — как конский. Обидчивая, злопамятная. Желание жирного.' },

  // --- Атипичные/сложные ---
  { id: 31, expected: 'thuj', name: 'Thuja: бородавки + секретность',
    text: 'Мужчина 40 лет. Множественные бородавки. Скрытный — никому не доверяет. Ощущение что внутри что-то живое двигается. Левая сторона хуже. Жирная кожа. Пот с чесночным запахом.' },
  { id: 32, expected: 'plat', name: 'Plat: высокомерная',
    text: 'Женщина 35 лет. Считает себя выше окружающих. Онемение и холод конечностей. Менструации тёмные, обильные, со сгустками. Сексуальное возбуждение повышено. Спазмы и сжатие.' },
  { id: 33, expected: 'aur', name: 'Aur: вина и депрессия',
    text: 'Мужчина 58 лет. Глубокая депрессия — чувствует что совершил грех. Мысли о суициде. Гипертония. Боли в костях ночью. Ответственный — считает что подвёл всех. Хуже от заката до рассвета.' },
  { id: 34, expected: 'stram', name: 'Stram: ужас в темноте',
    text: 'Ребёнок 3 года. Дикий страх темноты — кричит ночью. Просит свет. Видит чудовищ. Заикается от испуга. Агрессивный — бьёт и кусает. Лицо красное, глаза блестят. Жажда воды но боится пить.' },
  { id: 35, expected: 'verat', name: 'Verat: коллапс с поносом',
    text: 'Мужчина 40 лет. Сильнейший понос — фонтаном. Одновременно рвота. Холодный пот на лбу. Бледный как мел. Конечности ледяные. Жажда холодной воды. Судороги в икрах. Коллапс.' },

  // --- Детские ---
  { id: 36, expected: 'bar-c', name: 'Bar-c: отстающий малыш',
    text: 'Мальчик 4 года. Маленький для возраста. Пошёл в 2 года, заговорил в 3. При чужих прячется за маму. Миндалины огромные, часто болеет горлом. Голова потеет. Зябкий.' },
  { id: 37, expected: 'cina', name: 'Cina: капризный с глистами',
    text: 'Девочка 5 лет. Скрипит зубами ночью. Постоянно ковыряет в носу. Капризная — ничего не нравится. Голод постоянный — ест и не наедается. Боли вокруг пупка. Бледная с тёмными кругами.' },

  // --- Травмы ---
  { id: 38, expected: 'arn', name: 'Arn: ушиб — всё хорошо',
    text: 'Мужчина 30 лет. Упал с велосипеда. Ушибы по всему телу. Говорит «всё нормально, мне не нужна помощь». Кровать кажется жёсткой — всё болит. Боится прикосновений к больным местам.' },
  { id: 39, expected: 'hyper', name: 'Hyper: повреждение нерва',
    text: 'Женщина 45 лет. Прищемила палец дверью. Стреляющая боль вверх по руке — по ходу нерва. Онемение кончика пальца. Боль невыносимая, пульсирующая.' },

  // --- Женские ---
  { id: 40, expected: 'cimic', name: 'Cimic: менструальные боли',
    text: 'Женщина 30 лет. Боли при месячных — чем сильнее кровотечение тем сильнее боль. Боль отдаёт в бёдра. Мрачное настроение перед месячными — как чёрная туча. Скованность в шее и спине.' },
  { id: 41, expected: 'puls', name: 'Puls: задержка от намокания',
    text: 'Девушка 18 лет. Месячные нерегулярные — задержки. Хуже в тёплой комнате, лучше на улице. Плаксивая — плачет рассказывая жалобы. Нет жажды. Выделения густые жёлтые мягкие.' },

  // --- Кожные ---
  { id: 42, expected: 'petr', name: 'Petr: трещины зимой',
    text: 'Мужчина 50 лет. Зимой трескается кожа на руках до крови. Глубокие трещины на кончиках пальцев. Укачивает в транспорте. Кожа грубая шершавая. Голод постоянный.' },
  { id: 43, expected: 'rhus-t', name: 'Rhus-t: пузырьковая сыпь',
    text: 'Мужчина 35 лет. Пузырьковая сыпь на коже — зудит нестерпимо. Хуже от покоя и холода. Лучше от горячего душа. Беспокойный — не может найти удобное положение. Суставы скованы утром.' },

  // --- Респираторные ---
  { id: 44, expected: 'spong', name: 'Spong: лающий до полуночи',
    text: 'Мальчик 3 года. Кашель сухой как лай тюленя. Начинается вечером, хуже до полуночи. Дыхание шумное — как через пилу. Просыпается от удушья. Тёплое питьё помогает.' },
  { id: 45, expected: 'dros', name: 'Dros: приступы до рвоты',
    text: 'Девочка 6 лет. Кашель приступами — серия за серией, пока не вырвет. Хуже ночью после полуночи. Лёжа хуже. Держится за грудь при кашле. Носовые кровотечения при кашле.' },
  { id: 46, expected: 'ant-t', name: 'Ant-t: хрипы полная грудь',
    text: 'Мужчина 70 лет. Грудь полная мокроты — клокочет но откашлять не может. Одышка лёжа. Бледный, синюшный. Сонливый. Язык обложен белым. Нет жажды. Тошнота.' },

  // --- Мочевые ---
  { id: 47, expected: 'canth', name: 'Canth: режущий цистит',
    text: 'Женщина 28 лет. Цистит — режущие жгучие боли при мочеиспускании. Постоянные позывы — каждые 5 минут по каплям. Кровь в моче. Боль невыносимая.' },

  // --- ЖКТ ---
  { id: 48, expected: 'coloc', name: 'Coloc: спазмы после ссоры',
    text: 'Женщина 40 лет. После ссоры с начальником — резкие схваткообразные боли в животе. Сгибается пополам — так легче. Лучше от давления на живот. Правый бок. Понос от боли.' },
  { id: 49, expected: 'ip', name: 'Ip: постоянная тошнота',
    text: 'Женщина 25 лет. Тошнота постоянная — не проходит даже после рвоты. Язык чистый при этом. Нет жажды. Кровотечение яркое красное. Хуже от движения.' },
  { id: 50, expected: 'chin', name: 'Chin: слабость от потери жидкости',
    text: 'Мужчина 45 лет. Ослаб после длительной диареи. Живот вздут как барабан — газы не отходят. Шум в ушах. Периодические ознобы. Боли давящие, лучше от сгибания.' },
]

// === Подсчёт метрик ===
type ParsingMetrics = {
  symptomCount: number
  mentalCount: number
  generalCount: number
  particularCount: number
  modalityCount: number
  hasW3: boolean
  familyHistory: number
}

function metricsFor(symptoms: MDRISymptom[], modalities: MDRIModality[], fh: string[]): ParsingMetrics {
  return {
    symptomCount: symptoms.filter(s => s.present).length,
    mentalCount: symptoms.filter(s => s.present && s.category === 'mental').length,
    generalCount: symptoms.filter(s => s.present && s.category === 'general').length,
    particularCount: symptoms.filter(s => s.present && s.category === 'particular').length,
    modalityCount: modalities.length,
    hasW3: symptoms.some(s => s.weight === 3),
    familyHistory: fh.length,
  }
}

// === Main ===
async function main() {
  console.log('Загрузка данных...')
  const data = loadData()
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

  console.log(`Запуск ${CASES.length} full-flow тестов...\n`)

  let top1 = 0, top3 = 0, top5 = 0
  let parseOk = 0, parseFail = 0
  let totalSymptoms = 0, totalModalities = 0
  let totalFallbackAdded = 0
  const misses: string[] = []
  const parseFailures: string[] = []

  for (const c of CASES) {
    process.stdout.write(`  #${c.id} ${c.name.padEnd(40)} `)

    // 1. Sonnet parsing
    const sonnet = await parseText(client, c.text)
    const sonnetMetrics = metricsFor(sonnet.symptoms, sonnet.modalities, sonnet.familyHistory)

    // 2. Keyword fallback + merge (включая familyHistory fallback)
    const merged = mergeWithFallback(c.text, sonnet.symptoms, sonnet.modalities, sonnet.familyHistory)
    const mergedMetrics = metricsFor(merged.symptoms, merged.modalities, merged.familyHistory)
    const fallbackAdded = merged.symptoms.length - sonnet.symptoms.length

    totalSymptoms += mergedMetrics.symptomCount
    totalModalities += mergedMetrics.modalityCount
    totalFallbackAdded += fallbackAdded

    // Parsing quality check
    if (mergedMetrics.symptomCount >= 3 && mergedMetrics.mentalCount + mergedMetrics.generalCount >= 1) {
      parseOk++
    } else {
      parseFail++
      parseFailures.push(`#${c.id} ${c.name}: ${mergedMetrics.symptomCount} syms (${mergedMetrics.mentalCount}M/${mergedMetrics.generalCount}G/${mergedMetrics.particularCount}P)`)
    }

    // 3. Engine
    const profile: MDRIPatientProfile = DEFAULT_PROFILE
    const results = analyzePipeline(data, merged.symptoms, merged.modalities, merged.familyHistory, profile)

    const topRemedy = results[0]?.remedy ?? '?'
    const topScore = results[0]?.totalScore ?? 0
    const isTop1 = topRemedy === c.expected
    const isTop3 = results.slice(0, 3).some(r => r.remedy === c.expected)
    const isTop5 = results.slice(0, 5).some(r => r.remedy === c.expected)

    if (isTop1) top1++
    if (isTop3) top3++
    if (isTop5) top5++

    const status = isTop1 ? '[OK ]' : isTop3 ? '[~3 ]' : isTop5 ? '[~5 ]' : '[XX ]'
    const top5str = results.slice(0, 5).map(r => `${r.remedy}(${r.totalScore})`).join(', ')
    console.log(`${status} → ${topRemedy.padEnd(8)} | syms:${mergedMetrics.symptomCount}(+${fallbackAdded}fb) mod:${mergedMetrics.modalityCount} | ${top5str}`)

    if (!isTop1) {
      const pos = results.findIndex(r => r.remedy === c.expected)
      misses.push(`  #${c.id} ${c.name}: exp=${c.expected} got=${topRemedy} pos=${pos >= 0 ? pos + 1 : 'NOT FOUND'}`)
    }

    // Пауза чтобы не рейтлимитнуться
    await new Promise(r => setTimeout(r, 500))
  }

  console.log('\n' + '='.repeat(80))
  console.log('ИТОГО:')
  console.log(`  Top-1:  ${top1}/${CASES.length} (${Math.round(top1 / CASES.length * 100)}%)`)
  console.log(`  Top-3:  ${top3}/${CASES.length} (${Math.round(top3 / CASES.length * 100)}%)`)
  console.log(`  Top-5:  ${top5}/${CASES.length} (${Math.round(top5 / CASES.length * 100)}%)`)
  console.log()
  console.log('PARSING:')
  console.log(`  Успешный парсинг (≥3 syms + mental/general): ${parseOk}/${CASES.length} (${Math.round(parseOk / CASES.length * 100)}%)`)
  console.log(`  Среднее симптомов/кейс: ${(totalSymptoms / CASES.length).toFixed(1)}`)
  console.log(`  Среднее модальностей/кейс: ${(totalModalities / CASES.length).toFixed(1)}`)
  console.log(`  Keyword fallback добавил: ${totalFallbackAdded} симптомов (${(totalFallbackAdded / CASES.length).toFixed(1)}/кейс)`)
  console.log()

  if (parseFail > 0) {
    console.log('PARSE FAILURES:')
    for (const f of parseFailures) console.log(`  ${f}`)
    console.log()
  }

  if (misses.length > 0) {
    console.log('ПРОМАХИ:')
    for (const m of misses) console.log(m)
  }
}

main().catch(console.error)
