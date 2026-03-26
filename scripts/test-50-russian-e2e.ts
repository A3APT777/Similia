/**
 * E2E тест: 50 кейсов на русском через полный pipeline
 * Sonnet парсит русский текст → mergeWithFallback → MDRI engine → верификатор → confidence
 * Максимально реалистично — как врач вводит на сайте.
 */
import Anthropic from '@anthropic-ai/sdk'
import { loadMDRIData } from '../src/lib/mdri/data-loader'
import { analyzePipeline } from '../src/lib/mdri/engine'
import { mergeWithFallback, computeConfidence, validateInput } from '../src/lib/mdri/product-layer'
import { PARSING_SYSTEM_PROMPT } from '../src/lib/mdri/parsing-prompt'
import { inferPatientProfile, toEngineProfile } from '../src/lib/mdri/infer-profile'
import type { MDRISymptom, MDRIModality } from '../src/lib/mdri/types'

const client = new Anthropic({
  baseURL: process.env.ANTHROPIC_BASE_URL || undefined,
})

type TestCase = {
  id: number
  name: string
  expected: string
  text: string  // русский текст как от врача
}

// 50 кейсов на русском — как врач бы написал
const CASES: TestCase[] = [
  // === КЛАССИЧЕСКИЕ КОНСТИТУЦИОНАЛЬНЫЕ ===
  { id: 1, name: 'Sulph', expected: 'Sulph.', text: 'Мужчина 50 лет. Зябкий, но кожа горит. Зуд кожи хуже от тепла и мытья. Жжение стоп ночью — высовывает из-под одеяла. Голод в 11 утра. Не любит мыться. Философствует, теоретизирует. Стоять хуже всего. Покраснение всех отверстий тела.' },
  { id: 2, name: 'Calc', expected: 'Calc.', text: 'Мальчик 5 лет. Потеет голова ночью — подушка мокрая. Стопы холодные и влажные. Поздно пошёл, зубы поздно прорезались. Любит яйца. Боится собак. Упрямый. Очень зябкий. Полный, рыхлый. Кислый запах пота.' },
  { id: 3, name: 'Lyc', expected: 'Lyc.', text: 'Мужчина 45 лет. Вздутие живота после нескольких глотков еды. Все жалобы справа. Хуже с 16 до 20 часов. Тревога перед выступлениями. Властный дома, робкий на людях. Любит сладкое. Тёплое питьё лучше.' },
  { id: 4, name: 'Phos', expected: 'Phos.', text: 'Девушка 25 лет. Носовые кровотечения яркой красной кровью. Боится темноты, грозы и одиночества. Очень сочувственная и чуткая. Сильная жажда холодной воды большими глотками. Хуже в сумерках. Жжение между лопатками. Любит мороженое.' },
  { id: 5, name: 'Sep', expected: 'Sep.', text: 'Женщина 42 года. Безразличие к семье — не хочет видеть мужа и детей. Ощущение что всё тянет вниз — как будто матка выпадает. Жёлтые пятна на лице. Любит уксус. Значительно лучше от энергичных упражнений и танцев.' },
  { id: 6, name: 'Ars', expected: 'Ars.', text: 'Мужчина 60 лет. Тревога за здоровье — уверен что болен раком. Педантичный, всё должно быть на месте. Беспокойный — не может лежать, ходит по комнате. Хуже после полуночи. Зябкий. Жгучие боли но лучше от горячих компрессов. Пьёт маленькими глотками часто. Сильная слабость не пропорциональная болезни.' },
  { id: 7, name: 'Nux-v', expected: 'Nux-v.', text: 'Бизнесмен 40 лет. Раздражительный, нетерпеливый, ругается. Злоупотребляет кофе и алкоголем. Зябкий. Хуже утром. Спазмы в животе после еды. Запоры с безрезультатными позывами. Бессонница — просыпается в 3 часа ночи и не может уснуть.' },
  { id: 8, name: 'Puls', expected: 'Puls.', text: 'Девочка 12 лет. Плаксивая, легко обижается, ищет утешения. Настроение переменчивое — то плачет, то смеётся. Хуже в душном помещении, лучше на свежем воздухе. Не переносит жирную пищу. Жажды нет. Месячные поздние скудные.' },

  // === ОСТРЫЕ ===
  { id: 9, name: 'Bell', expected: 'Bell.', text: 'Ребёнок 3 года. Внезапная высокая температура 40. Лицо красное горячее. Зрачки расширены. Пульсирующая головная боль хуже от света и шума. Бред в жару. Всё внезапно началось.' },
  { id: 10, name: 'Acon', expected: 'Acon.', text: 'Мужчина 30 лет. После переохлаждения — внезапная температура, озноб. Сильный страх смерти, уверен что умрёт. Беспокойный, мечется. Жажда холодной воды. Всё началось после холодного ветра. Кожа сухая горячая.' },
  { id: 11, name: 'Bry', expected: 'Bry.', text: 'Женщина 50 лет. Артрит. Любое движение усиливает боль. Хочется лежать абсолютно неподвижно. Сильная жажда — пьёт много, большими глотками, редко. Раздражительная, не хочет чтобы беспокоили. Сухость всех слизистых. Колющие боли.' },
  { id: 12, name: 'Rhus-t', expected: 'Rhus-t.', text: 'Мужчина 55 лет. Боли в суставах. Первые движения мучительны, но расходится — лучше от движения. Хуже от покоя и сырости. Беспокойный ночью — не может найти удобное положение. Лучше от горячей ванны.' },

  // === MENTAL ===
  { id: 13, name: 'Nat-m', expected: 'Nat-m.', text: 'Женщина 35 лет. После развода 3 года назад замкнулась. Не плачет при людях, только одна. Не хочет утешений — становится хуже. Головные боли от солнца. Любит солёное. Трещина на нижней губе. Герпес при простуде.' },
  { id: 14, name: 'Ign', expected: 'Ign.', text: 'Женщина 28 лет. Потеря близкого 2 месяца назад. Постоянно вздыхает. Ком в горле. Настроение меняется — то плачет, то смеётся. Парадоксы: голод но еда отвращает, боль в горле лучше от глотания. Не может есть.' },
  { id: 15, name: 'Staph', expected: 'Staph.', text: 'Мужчина 38 лет. Подавляет гнев — никогда не скажет что думает. Обижается но молчит. После унижения на работе — появились ячмени на глазах. Зубы крошатся. Повышенное либидо.' },
  { id: 16, name: 'Aur', expected: 'Aur.', text: 'Мужчина 55 лет. Тяжёлая депрессия, чувство вины. Думает о суициде. Очень ответственный, работоголик. Хуже ночью. Сердцебиение, ощущение что сердце останавливается. Боли в костях.' },
  { id: 17, name: 'Lach', expected: 'Lach.', text: 'Женщина 52 лет. Приливы в менопаузе. Все жалобы слева. Не переносит тесную одежду на шее и животе. Ревнивая, подозрительная. Очень разговорчивая, перескакивает с темы на тему. Хуже после сна. Жаркая.' },

  // === ДЕТИ ===
  { id: 18, name: 'Cham', expected: 'Cham.', text: 'Ребёнок 1 год. Прорезывание зубов — кричит от боли, невозможно успокоить. Одна щека красная, другая бледная. Капризный — просит и тут же отталкивает. Успокаивается только когда носят на руках. Стул зелёный.' },
  { id: 19, name: 'Cina', expected: 'Cina.', text: 'Мальчик 6 лет. Скрипит зубами во сне. Очень раздражительный, не хочет чтобы трогали. Ковыряет в носу постоянно. Голод ненасытный, но худеет. Тёмные круги под глазами. Подозрение на глисты.' },
  { id: 20, name: 'Bar-c', expected: 'Bar-c.', text: 'Мальчик 4 года. Отстаёт в развитии — поздно заговорил, мелкий для возраста. Робкий, прячется за маму. Увеличены миндалины и лимфоузлы. Частые ангины. Зябкий. Потеют стопы с запахом.' },

  // === КОЖА ===
  { id: 21, name: 'Graph', expected: 'Graph.', text: 'Женщина 48 лет. Толстая, зябкая. Мокнущая экзема в складках — за ушами, между пальцами. Выделяется липкая жидкость цвета мёда. Трещины на сосках и в углах рта. Запоры — стул крупный, с слизью.' },
  { id: 22, name: 'Petr', expected: 'Petr.', text: 'Мужчина 35 лет. Экзема на руках — глубокие болезненные трещины. Хуже зимой, лучше летом. Кожа грубая сухая. Тошнота в транспорте — укачивание. Голод — должен есть ночью чтобы не тошнило.' },
  { id: 23, name: 'Sil', expected: 'Sil.', text: 'Девушка 20 лет. Тонкая, хрупкая, зябкая. Нагноения — каждый порез гноится. Потеют стопы с запахом. Робкая, уступает всем. Упрямая в мелочах. Непереносимость молока. Ногти с белыми пятнами ломкие.' },
  { id: 24, name: 'Hep', expected: 'Hep.', text: 'Мужчина 40 лет. Крайняя чувствительность к боли — малейшее прикосновение невыносимо. Нагноения с зловонным гноем. Очень зябкий — малейший сквозняк хуже. Раздражительный, вспыльчивый. Занозистые боли.' },

  // === ЖЕНСКИЕ ===
  { id: 25, name: 'Lil-t', expected: 'Lil-t.', text: 'Женщина 38 лет. Ощущение давления вниз в матке — хочется поддержать рукой. Раздражительная, в спешке. Сердцебиение. Жаркая. Чередование раздражительности с плаксивостью. Половое возбуждение.' },

  // === ДЫХАТЕЛЬНЫЕ ===
  { id: 26, name: 'Spong', expected: 'Spong.', text: 'Ребёнок 5 лет. Лающий кашель как пила по дереву. Круп. Хуже до полуночи. Просыпается от удушья. Тревога с затруднённым дыханием. Тёплое питьё помогает.' },
  { id: 27, name: 'Dros', expected: 'Dros.', text: 'Ребёнок 3 года. Приступы кашля один за другим — коклюшеподобный. Хуже лёжа. Рвота от кашля. Кашель хуже после полуночи. Носовое кровотечение при кашле.' },
  { id: 28, name: 'Ip', expected: 'Ip.', text: 'Женщина 30 лет. Постоянная тошнота — ничто не облегчает. Язык чистый несмотря на тошноту. Рвота не помогает. Бронхит с хрипами в груди — не может откашлять мокроту. Кровотечения яркой кровью.' },

  // === ЖКТ ===
  { id: 29, name: 'Arg-n', expected: 'Arg-n.', text: 'Студент 22 года. Сильная тревога перед экзаменами — понос от волнения. Торопливый, импульсивный. Страх высоты и толпы. Любит сладкое, но от него хуже. Вздутие и отрыжка. Хуже от жары.' },
  { id: 30, name: 'Coloc', expected: 'Coloc.', text: 'Мужчина 45 лет. Сильнейшие спазмы в животе — сгибается пополам. Колики после гнева и негодования. Лучше от сильного давления на живот. Лучше от тепла. Понос от малейшего расстройства.' },
  { id: 31, name: 'Verat', expected: 'Verat.', text: 'Мужчина 35 лет. Рвота и понос одновременно с холодным потом. Коллапс, сильнейшая слабость. Жажда ледяной воды. Судороги в икрах. Живот вздут, болезнен. Всё началось после испорченной еды.' },

  // === ТРАВМЫ ===
  { id: 32, name: 'Arn', expected: 'Arn.', text: 'Мужчина 30 лет. Упал с лестницы, ушибы по всему телу. Говорит что в порядке, отказывается от помощи. Боится что до него дотронутся. Постель кажется слишком жёсткой. Синяки.' },
  { id: 33, name: 'Nat-s', expected: 'Nat-s.', text: 'Мужчина 50 лет. Травма головы год назад — с тех пор головные боли. Хуже от сырости и влажной погоды. Депрессия утром. Астматическое дыхание в сырую погоду. Понос утром после подъёма.' },

  // === НОЗОДЫ ===
  { id: 34, name: 'Tub', expected: 'Tub.', text: 'Подросток 15 лет. Худой, высокий. Постоянно хочет путешествовать, не сидит на месте. Легко простужается. Потеет ночью. Аллергии. Любит копчёное и холодное молоко. Увеличены лимфоузлы.' },
  { id: 35, name: 'Carc', expected: 'Carc.', text: 'Женщина 35 лет. Перфекционизм — всё должно быть идеально. Подавляет эмоции, никогда не жалуется. Любит путешествия и шоколад. Бессонница от мыслей. В семье рак у матери. Родинки множественные.' },
  { id: 36, name: 'Psor', expected: 'Psor.', text: 'Мужчина 40 лет. Зябкий до крайности — даже летом в тёплой одежде. Кожа грязная, зуд хуже от тепла постели. Отчаяние — не верит в выздоровление. Голод ночью. Понос ранним утром. Запах тела.' },

  // === СЕРДЦЕ/СОСУДЫ ===
  { id: 37, name: 'Kali-c', expected: 'Kali-c.', text: 'Женщина 55 лет. Просыпается в 2-4 часа ночи с тревогой и сердцебиением. Колющие боли в грудной клетке. Отёки верхних век. Зябкая. Боль в пояснице хуже в покое. Чувство долга. Астма ночью.' },
  { id: 38, name: 'Gels', expected: 'Gels.', text: 'Студентка 20 лет. Паралич от страха перед экзаменом. Ноги ватные, тремор, слабость. Веки тяжёлые, еле открывает. Голова тяжёлая. Нет жажды. Тупая головная боль в затылке. Понос от волнения.' },

  // === РЕДКИЕ ===
  { id: 39, name: 'Thuj', expected: 'Thuj.', text: 'Мужчина 35 лет. Бородавки множественные — после прививки от гриппа 2 года назад. Скрытный, ощущение что за ним наблюдают. Фиксированные идеи. Левая сторона хуже. Пот с запахом. Хуже от влажности.' },
  { id: 40, name: 'Con', expected: 'Con.', text: 'Мужчина 65 лет. Головокружение при повороте головы и при лежании. Слабость, дрожь. Уплотнения в молочных железах. Слезотечение на ветру. Хуже от холода. Импотенция.' },
  { id: 41, name: 'Lac-c', expected: 'Lac-c.', text: 'Женщина 30 лет. Боль в горле — перескакивает справа налево и обратно. Ангины с чередованием сторон. Низкая самооценка. Ощущение что парит в воздухе. Не переносит прикосновения к шее.' },
  { id: 42, name: 'Plat', expected: 'Plat.', text: 'Женщина 38 лет. Высокомерная, считает себя выше окружающих. Онемение лица и конечностей. Повышенная чувствительность половых органов. Менструации обильные тёмные со сгустками.' },
  { id: 43, name: 'Stram', expected: 'Stram.', text: 'Ребёнок 4 года. Ужас темноты — не может оставаться один. Ночные кошмары, просыпается с криком. Желание света и компании. Зрачки расширены. Жажда. Лицо красное. Бьётся, кусается в истерике.' },

  // === ОБЩИЕ МОДАЛЬНОСТИ ===
  { id: 44, name: 'Merc', expected: 'Merc.', text: 'Мужчина 45 лет. Слюнотечение — подушка мокрая от слюны ночью. Потливость ночью но не облегчает. Язвы во рту, зловонное дыхание. Хуже ночью. Чувствителен и к холоду и к теплу. Дрожь. Опухание языка с отпечатками зубов.' },
  { id: 45, name: 'Cocc', expected: 'Cocc.', text: 'Женщина 40 лет. Истощена уходом за больной матерью — не спала неделями. Головокружение, тошнота от транспорта. Слабость ног, дрожь. Онемение конечностей. Всё от потери сна.' },
  { id: 46, name: 'Ph-ac', expected: 'Ph-ac.', text: 'Юноша 18 лет. Полная апатия после смерти друга. Безразличен ко всему, не разговаривает. Волосы выпадают. Понос безболезненный обильный. Не хочет есть. Рост быстрый — боли роста.' },
  { id: 47, name: 'Ferr', expected: 'Ferr.', text: 'Женщина 25 лет. Анемия — бледная, слабая. Но при волнении лицо резко краснеет. Головокружение. Непереносимость яиц. Кровотечения яркой кровью. Пульсация по всему телу. Зябкая.' },
  { id: 48, name: 'All-c', expected: 'All-c.', text: 'Мужчина 30 лет. Насморк — обильные жгучие выделения из носа. Глаза слезятся но слёзы не жгут. Чихание частое. Хуже в тёплой комнате, лучше на холоде. Весенний поллиноз.' },
  { id: 49, name: 'Mag-p', expected: 'Mag-p.', text: 'Девушка 22 года. Спазматические боли — менструальные колики. Лучше от тепла, горячей грелки. Лучше от давления — сгибается пополам и прижимает грелку. Лучше от сгибания. Справа хуже.' },
  { id: 50, name: 'Apis', expected: 'Apis.', text: 'Женщина 28 лет. Отёк, жалящие колющие боли. Нет жажды совсем. Хуже от тепла, лучше от холодных компрессов. Кожа розовая восковидная. Ревнивая. Суетливость. Хуже справа.' },
]

async function parseWithSonnet(text: string) {
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
      symptoms: (parsed.symptoms ?? []).map((s: Record<string, unknown>) => ({
        rubric: String(s.rubric ?? ''),
        category: (['mental', 'general', 'particular'].includes(String(s.category)) ? s.category : 'particular') as 'mental' | 'general' | 'particular',
        present: s.present !== false,
        weight: Math.min(3, Math.max(1, Number(s.weight) || 2)),
      })) as MDRISymptom[],
      modalities: (parsed.modalities ?? []).map((m: Record<string, unknown>) => ({
        pairId: String(m.pairId ?? ''),
        value: m.value === 'amel' ? 'amel' as const : 'agg' as const,
      })) as MDRIModality[],
      familyHistory: (parsed.familyHistory ?? []).map((f: unknown) => String(f)),
    }
  } catch {
    return { symptoms: [] as MDRISymptom[], modalities: [] as MDRIModality[], familyHistory: [] as string[] }
  }
}

async function main() {
  console.log('Загрузка MDRI данных...')
  const data = await loadMDRIData()
  console.log(`Загружено: ${data.repertory.length} рубрик\n`)

  const stats = {
    total: 0, top1: 0, top3: 0, top5: 0,
    byConfidence: {} as Record<string, { total: number; correct: number }>,
    misses: [] as { name: string; expected: string; got: string; conf: string; gap: number }[],
    parseErrors: 0,
    totalTime: 0,
  }

  for (const c of CASES) {
    const t0 = Date.now()
    process.stdout.write(`  #${String(c.id).padStart(2)} ${c.name.padEnd(8)} `)

    try {
      // 1. Sonnet парсит русский текст
      const parseResult = await parseWithSonnet(c.text)

      if (parseResult.symptoms.length === 0) {
        console.log(`| PARSE FAIL — 0 симптомов`)
        stats.parseErrors++
        stats.total++
        continue
      }

      // 2. Merge с keyword fallback
      const merged = mergeWithFallback(c.text, parseResult.symptoms, parseResult.modalities, parseResult.familyHistory)

      // 3. Profile inference
      const inferred = inferPatientProfile(c.text, merged.symptoms)
      const profile = toEngineProfile(inferred)

      // 4. MDRI Engine
      const results = analyzePipeline(data, merged.symptoms, merged.modalities, merged.familyHistory, profile)

      // 5. Confidence
      const warnings = validateInput(merged.symptoms, merged.modalities)
      const conf = computeConfidence(merged.symptoms, merged.modalities, results, warnings)

      const top1 = results[0]
      const top5 = results.slice(0, 5)
      const gap = top1 ? top1.totalScore - (results[1]?.totalScore ?? 0) : 0
      const isCorrect = top1?.remedy === c.expected
      const posInTop5 = top5.findIndex(r => r.remedy === c.expected) + 1
      const posInTop3 = results.slice(0, 3).findIndex(r => r.remedy === c.expected) + 1

      stats.total++
      if (isCorrect) stats.top1++
      if (posInTop3 > 0) stats.top3++
      if (posInTop5 > 0) stats.top5++

      // Confidence stats
      if (!stats.byConfidence[conf.level]) stats.byConfidence[conf.level] = { total: 0, correct: 0 }
      stats.byConfidence[conf.level].total++
      if (isCorrect) stats.byConfidence[conf.level].correct++

      const elapsed = Date.now() - t0
      stats.totalTime += elapsed

      const mark = isCorrect ? '✓' : '✗'
      const topList = top5.map(r => `${r.remedy.toLowerCase().replace('.', '')}(${r.totalScore})`).join(', ')
      console.log(`| ${conf.level.padEnd(7)} | ${top1?.remedy.padEnd(8)} ${mark} | gap=${gap} | ${merged.symptoms.length}sym | ${elapsed}ms | ${topList}`)

      if (!isCorrect) {
        stats.misses.push({ name: c.name, expected: c.expected, got: top1?.remedy || '?', conf: conf.level, gap })
      }
    } catch (e) {
      const elapsed = Date.now() - t0
      console.log(`| ERROR: ${e instanceof Error ? e.message.slice(0, 60) : 'unknown'} | ${elapsed}ms`)
      stats.total++
    }
  }

  // Итоги
  console.log('\n' + '='.repeat(100))
  console.log('ИТОГО:')
  console.log(`  Top-1:  ${stats.top1}/${stats.total} (${Math.round(stats.top1 / stats.total * 100)}%)`)
  console.log(`  Top-3:  ${stats.top3}/${stats.total} (${Math.round(stats.top3 / stats.total * 100)}%)`)
  console.log(`  Top-5:  ${stats.top5}/${stats.total} (${Math.round(stats.top5 / stats.total * 100)}%)`)
  console.log(`  Parse errors: ${stats.parseErrors}`)
  console.log(`  Avg time: ${Math.round(stats.totalTime / stats.total)}ms`)

  console.log('\nConfidence калибровка:')
  for (const [level, s] of Object.entries(stats.byConfidence)) {
    console.log(`  ${level}: ${s.correct}/${s.total} (${Math.round(s.correct / s.total * 100)}%) correct`)
  }

  if (stats.misses.length > 0) {
    console.log('\nПРОМАХИ:')
    for (const m of stats.misses) {
      console.log(`  ${m.name}: expected ${m.expected}, got ${m.got} (conf=${m.conf}, gap=${m.gap})`)
    }
  }
}

main().catch(console.error)
