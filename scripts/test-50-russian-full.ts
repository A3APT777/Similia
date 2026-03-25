/**
 * Прогон 50 кейсов через ПОЛНЫЙ AI flow:
 * русский текст → Sonnet parsing → keyword fallback → engine → confidence → conflict check
 *
 * Честный аудит: тестируем реальное поведение, не идеальный вход.
 * Sonnet API вызывается для каждого кейса (~$0.50 за 50 кейсов).
 *
 * Запуск: npx tsx scripts/test-50-russian-full.ts
 * Результат: scripts/test-50-russian-results.json
 */

import { writeFileSync } from 'fs'
import { join } from 'path'

// Загружаем .env.local для API ключа
import { config } from 'dotenv'
config({ path: join(process.cwd(), '.env.local') })

import Anthropic from '@anthropic-ai/sdk'

// Engine imports (через полный pipeline)
import { readFileSync } from 'fs'
import { analyzePipeline, buildIndices } from '../src/lib/mdri/engine'
import type { MDRIData } from '../src/lib/mdri/engine'
import type {
  MDRISymptom, MDRIModality,
  MDRIRepertoryRubric, MDRIConstellationData, MDRIPolarityData,
  MDRIClinicalData, MDRIResult,
} from '../src/lib/mdri/types'
import { DEFAULT_PROFILE } from '../src/lib/mdri/types'
import { PARSING_SYSTEM_PROMPT } from '../src/lib/mdri/parsing-prompt'
import { mergeWithFallback, computeConfidence, validateInput, checkHypothesisConflict } from '../src/lib/mdri/product-layer'
import { inferPatientProfile, toEngineProfile } from '../src/lib/mdri/infer-profile'

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
  for (const cd of clinicalRaw) {
    if (cd.type === 'thermal_contradiction' && cd.data) Object.assign(clinicalData.thermal_contradictions, cd.data)
  }
  const indices = buildIndices(repertory, constellations)
  return { repertory, constellations, polarities, relationships: {}, clinicalData, ...indices }
}

// === Sonnet parsing ===
async function parseWithSonnet(client: Anthropic, text: string): Promise<{
  symptoms: MDRISymptom[], modalities: MDRIModality[], familyHistory: string[]
}> {
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
        rubric: String(s.rubric ?? ''), category: s.category ?? 'particular',
        present: s.present !== false, weight: Math.min(3, Math.max(1, Number(s.weight) || 1)),
      })),
      modalities: (parsed.modalities ?? []).map((m: any) => ({
        pairId: String(m.pairId ?? ''), value: m.value === 'amel' ? 'amel' as const : 'agg' as const,
      })),
      familyHistory: parsed.familyHistory ?? [],
    }
  } catch {
    return { symptoms: [], modalities: [], familyHistory: [] }
  }
}

// === 50 кейсов с русским текстом ===
type RussianCase = { id: number; name: string; expected: string; text: string }

const CASES: RussianCase[] = [
  { id: 1, name: 'Sulphur', expected: 'sulph', text: 'Зуд кожи, усиливается от тепла и мытья. Жжение стоп ночью — высовывает из-под одеяла. Голод в 11 утра, пустота в желудке. Не любит мыться. Склонен философствовать. Хуже стоя. Покраснение всех отверстий. Жаркий.' },
  { id: 2, name: 'Calc-carb', expected: 'calc', text: 'Ребёнок 3 года. Потеет голова ночью. Стопы холодные и влажные. Поздно пошёл, поздно зубы. Любит яйца. Боится собак. Упрямый. Очень зябкий. Кислый запах от тела.' },
  { id: 3, name: 'Lycopodium', expected: 'lyc', text: 'Вздутие живота после нескольких глотков еды. Все жалобы справа. Хуже с 16 до 20 часов. Тревога перед выступлениями. Властный, любит командовать. Любит сладкое. Тёплые напитки улучшают.' },
  { id: 4, name: 'Phosphorus', expected: 'phos', text: 'Носовые кровотечения яркой красной кровью. Боится темноты, грозы и одиночества. Очень сочувственный и чуткий. Жажда холодной воды большими глотками. Хуже в сумерках. Жжение между лопатками. Любит мороженое.' },
  { id: 5, name: 'Sepia', expected: 'sep', text: 'Безразличие к семье, не хочет видеть детей. Опущение внутренних органов. Хуже утром. Желтовато-коричневые пятна на лице. Лучше от энергичных упражнений. Тянет к кислому и уксусу.' },
  { id: 6, name: 'Arsenicum', expected: 'ars', text: 'Педантичный, всё должно быть идеально. Тревога о здоровье. Хуже после полуночи, особенно 1-2 часа. Жжение, но лучше от тепла — парадокс. Пьёт маленькими глотками часто. Зябкий. Беспокойный.' },
  { id: 7, name: 'Nux vomica', expected: 'nux-v', text: 'Бизнесмен, много кофе и алкоголя. Раздражительный, нетерпеливый. Хуже утром. Запоры с безрезультатными позывами. Зябкий. Чувствителен к шуму и свету. Хуже от переедания.' },
  { id: 8, name: 'Pulsatilla', expected: 'puls', text: 'Девочка, плаксивая, легко плачет от всего. Хочет утешения и внимания. Нет жажды. Хуже в тёплой комнате, лучше на свежем воздухе. Любит масло и жирное, но плохо переносит. Все выделения мягкие, жёлто-зелёные.' },
  { id: 9, name: 'Belladonna', expected: 'bell', text: 'Внезапная высокая температура 40. Лицо красное, горячее. Зрачки расширены. Пульсирующая головная боль. Хуже от света, шума, прикосновения. Бред при лихорадке. Правая сторона.' },
  { id: 10, name: 'Rhus-tox', expected: 'rhus-t', text: 'Скованность суставов хуже утром и от покоя. Первое движение болезненно, потом расходится — лучше от продолжительного движения. Беспокойный, не может лежать на месте. Хуже в сырую холодную погоду. Простуда после промокания.' },
  { id: 11, name: 'Staphysagria', expected: 'staph', text: 'Подавляет гнев и обиду. Не может выразить злость. Тремор от подавленных эмоций. Цистит после полового акта. Хуже от унижения. Зубы крошатся. Послеоперационная боль.' },
  { id: 12, name: 'Aurum', expected: 'aur', text: 'Глубокая депрессия с чувством вины. Думает о самоубийстве. Ощущение что провалил жизнь. Хуже ночью. Боль в костях. Гипертония. Ответственный, требовательный к себе.' },
  { id: 13, name: 'Chamomilla', expected: 'cham', text: 'Невыносимая боль при прорезывании зубов у ребёнка. Одна щека красная, другая бледная. Не успокаивается ничем, только когда носят на руках. Капризный, гневливый. Зелёный понос.' },
  { id: 14, name: 'Apis', expected: 'apis', text: 'Отёк, жалящие боли. Нет жажды. Хуже от тепла. Лучше от холодных компрессов. Кожа розовая, восковидная. Ревность. Суетливость. Правосторонний отит.' },
  { id: 15, name: 'Gelsemium', expected: 'gels', text: 'Дрожь, слабость, тяжесть. Тяжёлые веки, не может открыть глаза. Тупость, заторможенность. Понос от страха перед экзаменом. Нет жажды при лихорадке. Головная боль от затылка.' },
  { id: 16, name: 'Mercurius', expected: 'merc', text: 'Обильное слюноотделение ночью, подушка мокрая. Зловонный пот, не приносит облегчения. Язвы во рту. Хуже ночью. Лимфоузлы увеличены. Не переносит ни жару ни холод. Дёсны кровоточат.' },
  { id: 17, name: 'Conium', expected: 'con', text: 'Головокружение при повороте головы или в постели. Уплотнения, затвердения желёз. Хуже лёжа. Слабость ног поднимается вверх. Нарушение потенции у пожилых. Медленное прогрессирование.' },
  { id: 18, name: 'Kali-carb', expected: 'kali-c', text: 'Просыпается в 2-4 часа ночи с тревогой. Колющие боли. Отёки верхних век. Зябкий. Боль в пояснице, хуже в покое. Чувство долга, правила. Слабость. Астма ночью.' },
  { id: 19, name: 'Argentum nitricum', expected: 'arg-n', text: 'Тревога ожидания: перед экзаменом, собеседованием — понос. Торопливость. Страх высоты, открытых пространств. Любит сладкое, но от него хуже. Вздутие с громкой отрыжкой. Жарко.' },
  { id: 20, name: 'Petroleum', expected: 'petr', text: 'Экзема с глубокими трещинами, хуже зимой. Кожа грубая, шершавая. Укачивает в транспорте. Тошнота от запаха бензина. Потрескавшиеся кончики пальцев. Хуже от холода.' },
  { id: 21, name: 'Lac caninum', expected: 'lac-c', text: 'Боль в горле меняет сторону: сегодня справа, завтра слева. Низкая самооценка, чувство никчёмности. Страх змей. Чувствительность груди перед менструацией. Выделения из носа тоже чередуют стороны.' },
  { id: 22, name: 'Cocculus', expected: 'cocc', text: 'Полное истощение от ухода за больным — не спала неделями. Головокружение, тошнота от поездок. Пустота в голове. Слабость в шее, голова падает. Онемение конечностей. Хуже от недосыпания.' },
  { id: 23, name: 'Thuja', expected: 'thuj', text: 'Бородавки появились после прививки. Жирная кожа. Пот с неприятным запахом. Ощущение что внутри что-то живое. Секретничает, скрытный. Фиксированные идеи. Хуже от сырости. Левая сторона.' },
  { id: 24, name: 'Spongia', expected: 'spong', text: 'Лающий сухой кашель, как пила по дереву. Круп. Хуже до полуночи. Удушье во сне. Ощущение пробки в гортани. Тревога с удушьем. Щитовидная железа увеличена.' },
  { id: 25, name: 'Ipecacuanha', expected: 'ip', text: 'Постоянная тошнота, не облегчается рвотой. Язык чистый при тошноте. Кровотечения ярко-красные. Кашель с тошнотой. Хуже в тепле. Бронхоспазм с хрипами.' },
  { id: 26, name: 'Drosera', expected: 'dros', text: 'Приступообразный кашель, как коклюш. Кашель следует друг за другом без перерыва. Хуже после полуночи, лёжа. Рвота от кашля. Носовое кровотечение при кашле. Першение в гортани.' },
  { id: 27, name: 'Colocynthis', expected: 'coloc', text: 'Жестокие колики, сгибается пополам. Боль после гнева или обиды. Лучше от сильного давления и тепла. Понос от боли. Невралгия лица слева. Горечь во рту.' },
  { id: 28, name: 'Tabacum', expected: 'tab', text: 'Сильное укачивание: тошнота, бледность, холодный пот. Лучше на свежем воздухе, от раскрывания живота. Ледяной холод тела. Морская болезнь. Слабость и обморок.' },
  { id: 29, name: 'Causticum', expected: 'caust', text: 'Охриплость, потеря голоса. Обострённое чувство справедливости, переживает за других. Паралич лицевого нерва. Ночной энурез. Контрактуры сухожилий. Хуже в сухую холодную погоду. Зябкий.' },
  { id: 30, name: 'Stramonium', expected: 'stram', text: 'Паника, ужас темноты. Насильственное, агрессивное поведение. Галлюцинации. Расширенные зрачки. Судороги от испуга. Заикание. Боится воды. Хуже ночью и в одиночестве.' },
  { id: 31, name: 'Medorrhinum', expected: 'med', text: 'Спит только на животе. На море значительно лучше. Торопится. Грызёт ногти. Хронические выделения. Боли в пятках. Хуже днём. Любит апельсины. Ощущение нереальности.' },
  { id: 32, name: 'Tuberculinum', expected: 'tub', text: 'Постоянное желание перемен и путешествий. Худеет несмотря на хороший аппетит. Частые простуды и бронхиты. Потливость ночью. Боится собак и кошек. Раздражительный от мелочей. Романтичный.' },
  { id: 33, name: 'Psorinum', expected: 'psor', text: 'Крайне зябкий, мёрзнет даже летом. Грязная кожа, запах тела. Безнадёжность, отчаяние выздоровления. Хронические зловонные выделения. Голод ночью. Зуд хуже от тепла постели.' },
  { id: 34, name: 'Carcinosinum', expected: 'carc', text: 'Перфекционист, угождает другим в ущерб себе. Подавление эмоций с детства. Любит танцевать, шоколад, путешествия. Множественные родинки. Сильное сочувствие. Бессонница от тревоги. Семейная онкология.' },
  { id: 35, name: 'Silicea', expected: 'sil', text: 'Тонкий, хрупкий, но упрямый. Очень зябкий. Потеют стопы с запахом. Нагноения хронические. Головная боль от затылка вперёд. Боится выступлений. Медленное заживление ран.' },
  { id: 36, name: 'Graphites', expected: 'graph', text: 'Полный, зябкий. Мокнущая экзема за ушами и в складках — выделения как мёд. Запоры: стул крупный, в комках, со слизью. Толстые ногти. Нерешительный.' },
  { id: 37, name: 'Hepar sulph', expected: 'hep', text: 'Крайне чувствителен к холоду и прикосновению. Нагноения с неприятным запахом. Раздражительный, вспыльчивый. Занозистые боли. Хуже от малейшего сквозняка. Потеет при малейшем усилии.' },
  { id: 38, name: 'Baryta carb', expected: 'bar-c', text: 'Ребёнок медленно развивается, отстаёт в учёбе. Стеснительный, прячется за маму. Увеличенные миндалины и аденоиды. Частые ангины. Маленький рост. Потливость стоп.' },
  { id: 39, name: 'Lachesis', expected: 'lach', text: 'Менопауза: приливы жара. Все жалобы слева. Хуже после сна. Не переносит тесную одежду на горле. Ревность и подозрительность. Болтливость, перескакивает с темы. Хуже весной.' },
  { id: 40, name: 'Phosphoricum acidum', expected: 'ph-ac', text: 'Полная апатия и безразличие после горя. Не плачет, просто лежит. Выпадение волос от горя. Понос без боли. Жажда фруктовых соков. Слабость. Рос слишком быстро.' },
  { id: 41, name: 'Bryonia', expected: 'bry', text: 'Артрит: любое движение ухудшает. Лежит абсолютно неподвижно. Сильная жажда холодной воды большими глотками. Раздражительный, хочет чтобы оставили в покое. Сухость всех слизистых. Колющие боли.' },
  { id: 42, name: 'Natrum muriaticum', expected: 'nat-m', text: 'Давнее горе, которое носит в себе. Плачет только одна, утешение ухудшает. Любит солёное. Головная боль от солнца. Герпес на губах. Хуже на солнце. Замкнутая, не показывает чувств.' },
  { id: 43, name: 'Arnica', expected: 'arn', text: 'После падения, травмы. Говорит "я в порядке", не хочет чтобы трогали. Ушибы, синяки. Кровать кажется жёсткой. Страх прикосновения. Кровоподтёки после любого удара.' },
  { id: 44, name: 'Veratrum album', expected: 'verat', text: 'Одновременно рвота и понос с холодным потом. Коллапс. Ледяной холод тела. Жажда ледяной воды. Судороги в икрах. Лицо бледное с синевой. Выраженная слабость.' },
  { id: 45, name: 'Magnesia phosph', expected: 'mag-p', text: 'Спазматические судорожные боли. Лучше от тепла и давления. Лучше сгибаясь пополам. Колики у младенцев. Менструальные спазмы лучше от грелки. Невралгия лица справа.' },
  { id: 46, name: 'Allium cepa', expected: 'all-c', text: 'Насморк: жгучие водянистые выделения из носа, разъедают верхнюю губу. Слезотечение мягкое, не разъедает. Хуже в тёплой комнате, лучше на свежем воздухе. Чихание.' },
  { id: 47, name: 'Ferrum met', expected: 'ferr', text: 'Анемия, но лицо легко краснеет. Приливы крови к голове. Слабость от малейшего усилия. Пульсирующая головная боль. Непереносимость яиц. Лучше от медленной ходьбы.' },
  { id: 48, name: 'Natrum sulph', expected: 'nat-s', text: 'Головная боль и астма хуже в сырую погоду. Понос утром. Депрессия хуже утром. Последствия травмы головы. Бородавки. Хуже на морском побережье. Желчные приступы.' },
  { id: 49, name: 'Cina', expected: 'cina', text: 'Ребёнок скрежещет зубами во сне. Ковыряет в носу. Капризный, не хочет чтобы трогали. Червячки в кале. Голод сразу после еды. Тёмные круги под глазами. Судороги.' },
  { id: 50, name: 'Platina', expected: 'plat', text: 'Высокомерная, считает себя выше других. Презрение к окружающим. Онемение, ощущение что тело увеличивается. Повышенное либидо. Менструации обильные, тёмные, рано приходят. Спазмы вагинизм.' },
]

// === Прогон ===
async function main() {
  console.log('=== ПОЛНЫЙ ПРОГОН 50 КЕЙСОВ: русский текст → Sonnet → engine ===\n')

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) { console.error('ANTHROPIC_API_KEY не найден в .env.local'); process.exit(1) }
  const client = new Anthropic({ apiKey })

  console.log('Загрузка данных...')
  const data = loadData()
  console.log(`Реперторий: ${data.repertory.length} | Constellations: ${Object.keys(data.constellations).length}\n`)

  const norm = (s: string) => s.toLowerCase().replace(/\.$/, '')

  type Result = {
    id: number; name: string; expected: string; russianText: string
    // Parsing
    sonnetSymptomCount: number; sonnetModalityCount: number
    fallbackSymptomsAdded: number; fallbackModalitiesAdded: number
    totalSymptoms: number; totalModalities: number; warningCount: number
    // Profile
    inferredCaseType: string; inferredVitality: string
    // Engine
    top1: string; top2: string; top3: string
    top1Score: number; top2Score: number; top3Score: number
    gap: number
    confidence: string; conflictLevel: string
    // Ground truth
    hitTop1: boolean; hitTop3: boolean; hitTop5: boolean; hitTop10: boolean
    positionOfExpected: number
    verdict: 'correct_top1' | 'correct_top3' | 'correct_top5' | 'correct_top10' | 'miss'
    // Debug
    parsedSymptoms: string[]
  }

  const results: Result[] = []
  let top1Hit = 0, top3Hit = 0, top5Hit = 0, top10Hit = 0
  let totalCost = 0

  for (const c of CASES) {
    process.stdout.write(`#${c.id} ${c.name}... `)

    // 1. Sonnet parsing
    const t0 = Date.now()
    const parseResult = await parseWithSonnet(client, c.text)
    const parseTime = Date.now() - t0
    totalCost += 0.01

    // 2. Keyword fallback + merge
    const { symptoms, modalities, warnings } = mergeWithFallback(c.text, parseResult.symptoms, parseResult.modalities)
    const fallbackS = symptoms.length - parseResult.symptoms.length
    const fallbackM = modalities.length - parseResult.modalities.length

    // 3. Profile inference
    const inferredProfile = inferPatientProfile(c.text, symptoms)
    const profile = toEngineProfile(inferredProfile)

    // 4. Engine
    const mdriResults = analyzePipeline(data, symptoms, modalities, parseResult.familyHistory, profile)
    const confidence = computeConfidence(symptoms, modalities, mdriResults, validateInput(symptoms, modalities))
    const conflict = checkHypothesisConflict(mdriResults)

    // 5. Ground truth check
    const top1 = mdriResults[0]?.remedy ?? ''
    const pos = mdriResults.findIndex(r => norm(r.remedy) === norm(c.expected))
    const hitT1 = norm(top1) === norm(c.expected)
    const hitT3 = mdriResults.slice(0, 3).some(r => norm(r.remedy) === norm(c.expected))
    const hitT5 = mdriResults.slice(0, 5).some(r => norm(r.remedy) === norm(c.expected))
    const hitT10 = pos >= 0

    if (hitT1) top1Hit++
    if (hitT3) top3Hit++
    if (hitT5) top5Hit++
    if (hitT10) top10Hit++

    const verdict = hitT1 ? 'correct_top1' : hitT3 ? 'correct_top3' : hitT5 ? 'correct_top5' : hitT10 ? 'correct_top10' : 'miss'
    const mark = hitT1 ? '✓' : hitT3 ? '~' : hitT5 ? '○' : hitT10 ? '·' : '✗'

    console.log(`${mark} ${top1.toUpperCase()} (exp: ${c.expected.toUpperCase()}) syms=${symptoms.length}+${fallbackS}fb mods=${modalities.length} gap=${mdriResults[0]?.totalScore - (mdriResults[1]?.totalScore ?? 0)} conf=${confidence.level} ${parseTime}ms`)

    if (!hitT3) {
      console.log(`   → pos=${pos >= 0 ? pos + 1 : 'NOT FOUND'} top5: ${mdriResults.slice(0, 5).map(r => `${r.remedy}(${r.totalScore})`).join(', ')}`)
    }

    results.push({
      id: c.id, name: c.name, expected: c.expected, russianText: c.text,
      sonnetSymptomCount: parseResult.symptoms.length,
      sonnetModalityCount: parseResult.modalities.length,
      fallbackSymptomsAdded: fallbackS, fallbackModalitiesAdded: fallbackM,
      totalSymptoms: symptoms.length, totalModalities: modalities.length,
      warningCount: warnings.length,
      inferredCaseType: inferredProfile.caseType.value,
      inferredVitality: inferredProfile.vitality.value,
      top1: norm(top1), top2: norm(mdriResults[1]?.remedy ?? ''), top3: norm(mdriResults[2]?.remedy ?? ''),
      top1Score: mdriResults[0]?.totalScore ?? 0, top2Score: mdriResults[1]?.totalScore ?? 0, top3Score: mdriResults[2]?.totalScore ?? 0,
      gap: (mdriResults[0]?.totalScore ?? 0) - (mdriResults[1]?.totalScore ?? 0),
      confidence: confidence.level, conflictLevel: conflict.level,
      hitTop1: hitT1, hitTop3: hitT3, hitTop5: hitT5, hitTop10: hitT10,
      positionOfExpected: pos >= 0 ? pos + 1 : -1,
      verdict,
      parsedSymptoms: symptoms.map(s => `${s.rubric} (${s.category}, w=${s.weight})`),
    })
  }

  // === Сводка ===
  console.log('\n═══════════════════════════════════════════════════')
  console.log('СВОДКА')
  console.log('═══════════════════════════════════════════════════')
  console.log(`Кейсов: ${CASES.length}`)
  console.log(`Top-1:  ${top1Hit}/${CASES.length} (${Math.round(top1Hit / CASES.length * 100)}%)`)
  console.log(`Top-3:  ${top3Hit}/${CASES.length} (${Math.round(top3Hit / CASES.length * 100)}%)`)
  console.log(`Top-5:  ${top5Hit}/${CASES.length} (${Math.round(top5Hit / CASES.length * 100)}%)`)
  console.log(`Top-10: ${top10Hit}/${CASES.length} (${Math.round(top10Hit / CASES.length * 100)}%)`)
  console.log(`Miss:   ${CASES.length - top10Hit}`)
  console.log(`Cost:   ~$${totalCost.toFixed(2)}`)
  console.log()

  // Статистика парсинга
  const avgSymptoms = Math.round(results.reduce((s, r) => s + r.totalSymptoms, 0) / results.length * 10) / 10
  const avgFallback = Math.round(results.reduce((s, r) => s + r.fallbackSymptomsAdded, 0) / results.length * 10) / 10
  const avgGap = Math.round(results.reduce((s, r) => s + r.gap, 0) / results.length * 10) / 10
  console.log(`Avg симптомов: ${avgSymptoms} (из них fallback: ${avgFallback})`)
  console.log(`Avg gap: ${avgGap}%`)
  console.log()

  // Confidence distribution
  const confDist = { high: 0, good: 0, clarify: 0, insufficient: 0 }
  for (const r of results) confDist[r.confidence as keyof typeof confDist]++
  console.log(`Confidence: high=${confDist.high} good=${confDist.good} clarify=${confDist.clarify} insufficient=${confDist.insufficient}`)

  // Conflict distribution
  const conflDist = { none: 0, differential: 0, hard: 0 }
  for (const r of results) conflDist[r.conflictLevel as keyof typeof conflDist]++
  console.log(`Conflict: none=${conflDist.none} differential=${conflDist.differential} hard=${conflDist.hard}`)
  console.log()

  // Провалы
  const misses = results.filter(r => !r.hitTop3)
  if (misses.length > 0) {
    console.log('ПРОВАЛЫ (не в top-3):')
    for (const m of misses) {
      console.log(`  #${m.id} ${m.name}: got ${m.top1} (exp ${m.expected}) pos=${m.positionOfExpected} syms=${m.totalSymptoms}`)
    }
  }
  console.log()

  // Сохранить
  const output = {
    timestamp: new Date().toISOString(),
    summary: {
      total: CASES.length, top1Hit, top3Hit, top5Hit, top10Hit,
      top1Pct: Math.round(top1Hit / CASES.length * 100),
      top3Pct: Math.round(top3Hit / CASES.length * 100),
      top5Pct: Math.round(top5Hit / CASES.length * 100),
      avgSymptoms, avgFallback, avgGap,
      confDist, conflDist,
      cost: totalCost,
    },
    results,
    misses: misses.map(m => ({ id: m.id, name: m.name, expected: m.expected, got: m.top1, position: m.positionOfExpected })),
  }
  writeFileSync(join(process.cwd(), 'scripts', 'test-50-russian-results.json'), JSON.stringify(output, null, 2))
  console.log('Результаты: scripts/test-50-russian-results.json')
}

main().catch(console.error)
