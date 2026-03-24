/**
 * Тест IDF-нормализации: before vs after на 50 кейсах.
 */
import { config } from 'dotenv'
config({ path: '.env.local' })

import { analyzePipeline as analyzeRaw } from '../src/lib/mdri/engine'
import { applyIdfWeights } from '../src/lib/mdri/product-layer'
import { loadMDRIData } from '../src/lib/mdri/data-loader'
import type { MDRISymptom, MDRIModality } from '../src/lib/mdri/types'
import { DEFAULT_PROFILE } from '../src/lib/mdri/types'

const CASES = [
  { id: 1, expected: 'sulph', text: 'Зуд кожи, усиливается от тепла и мытья. Жжение стоп ночью — высовывает из-под одеяла. Голод в 11 утра, пустота в желудке. Не любит мыться. Склонен философствовать. Хуже стоя. Покраснение всех отверстий. Жаркий.' },
  { id: 2, expected: 'calc', text: 'Ребёнок 3 года. Потеет голова ночью. Стопы холодные и влажные. Поздно пошёл, поздно зубы. Любит яйца. Боится собак. Упрямый. Очень зябкий. Кислый запах от тела.' },
  { id: 3, expected: 'lyc', text: 'Вздутие живота после нескольких глотков еды. Все жалобы справа. Хуже с 16 до 20 часов. Тревога перед выступлениями. Властный, любит командовать. Любит сладкое. Тёплые напитки улучшают.' },
  { id: 4, expected: 'phos', text: 'Носовые кровотечения яркой красной кровью. Боится темноты, грозы и одиночества. Очень сочувственный и чуткий. Жажда холодной воды большими глотками. Хуже в сумерках. Жжение между лопатками. Любит мороженое.' },
  { id: 5, expected: 'sep', text: 'Безразличие к семье, не хочет видеть детей. Опущение внутренних органов. Хуже утром. Желтовато-коричневые пятна на лице. Лучше от энергичных упражнений. Тянет к кислому и уксусу.' },
  { id: 6, expected: 'ars', text: 'Педантичный, всё должно быть идеально. Тревога о здоровье. Хуже после полуночи, особенно 1-2 часа. Жжение, но лучше от тепла — парадокс. Пьёт маленькими глотками часто. Зябкий. Беспокойный.' },
  { id: 7, expected: 'nux-v', text: 'Бизнесмен, много кофе и алкоголя. Раздражительный, нетерпеливый. Хуже утром. Запоры с безрезультатными позывами. Зябкий. Чувствителен к шуму и свету. Хуже от переедания.' },
  { id: 8, expected: 'puls', text: 'Девочка, плаксивая, легко плачет от всего. Хочет утешения и внимания. Нет жажды. Хуже в тёплой комнате, лучше на свежем воздухе. Любит масло и жирное, но плохо переносит. Все выделения мягкие, жёлто-зелёные.' },
  { id: 9, expected: 'bell', text: 'Внезапная высокая температура 40. Лицо красное, горячее. Зрачки расширены. Пульсирующая головная боль. Хуже от света, шума, прикосновения. Бред при лихорадке. Правая сторона.' },
  { id: 10, expected: 'rhus-t', text: 'Скованность суставов хуже утром и от покоя. Первое движение болезненно, потом расходится — лучше от продолжительного движения. Беспокойный, не может лежать на месте. Хуже в сырую холодную погоду. Простуда после промокания.' },
  { id: 42, expected: 'nat-m', text: 'Давнее горе, которое носит в себе. Плачет только одна, утешение ухудшает. Любит солёное. Головная боль от солнца. Герпес на губах. Хуже на солнце. Замкнутая, не показывает чувств.' },
  { id: 19, expected: 'arg-n', text: 'Тревога ожидания: перед экзаменом, собеседованием — понос. Торопливость. Страх высоты, открытых пространств. Любит сладкое, но от него хуже. Вздутие с громкой отрыжкой. Жарко.' },
  { id: 44, expected: 'verat', text: 'Одновременно рвота и понос с холодным потом. Коллапс. Ледяной холод тела. Жажда ледяной воды. Судороги в икрах. Лицо бледное с синевой. Выраженная слабость.' },
  { id: 18, expected: 'kali-c', text: 'Просыпается в 2-4 часа ночи с тревогой. Колющие боли. Отёки верхних век. Зябкий. Боль в пояснице, хуже в покое. Чувство долга, правила. Слабость. Астма ночью.' },
  { id: 49, expected: 'cina', text: 'Ребёнок скрежещет зубами во сне. Ковыряет в носу. Капризный, не хочет чтобы трогали. Червячки в кале. Голод сразу после еды. Тёмные круги под глазами. Судороги.' },
]

// Простой детерминированный парсер
function parse(text: string): { symptoms: MDRISymptom[], modalities: MDRIModality[] } {
  const symptoms: MDRISymptom[] = []
  const modalities: MDRIModality[] = []
  const lower = text.toLowerCase()

  const MAPS: { p: RegExp; r: string; c: 'mental'|'general'|'particular'; w: 1|2|3 }[] = [
    { p: /раздражител|нетерпелив|вспыльчив/, r: 'mind irritability', c: 'mental', w: 2 },
    { p: /тревог|беспоко/, r: 'mind anxiety', c: 'mental', w: 2 },
    { p: /страх.*темнот/, r: 'mind fear dark', c: 'mental', w: 3 },
    { p: /страх.*высот/, r: 'mind fear heights', c: 'mental', w: 3 },
    { p: /страх.*одиночеств/, r: 'mind fear alone', c: 'mental', w: 3 },
    { p: /страх.*гроз/, r: 'mind fear thunderstorm', c: 'mental', w: 3 },
    { p: /боит.*собак/, r: 'mind fear dogs', c: 'mental', w: 3 },
    { p: /плаксив|плачет|слёз/, r: 'mind weeping', c: 'mental', w: 2 },
    { p: /утешени.*ухудш|хуже.*утешен/, r: 'mind consolation aggravates', c: 'mental', w: 3 },
    { p: /хочет утешени|ищет.*компани/, r: 'mind consolation desires', c: 'mental', w: 3 },
    { p: /безразличи|апати/, r: 'mind indifference', c: 'mental', w: 2 },
    { p: /горе|утрат/, r: 'mind grief', c: 'mental', w: 2 },
    { p: /перфекционист|педантич/, r: 'mind perfectionist fastidious', c: 'mental', w: 2 },
    { p: /подавля.*гнев|подавля.*эмоц/, r: 'mind suppressed anger', c: 'mental', w: 3 },
    { p: /замкнут|закрыва/, r: 'mind reserved closed', c: 'mental', w: 2 },
    { p: /философств/, r: 'mind philosophical', c: 'mental', w: 2 },
    { p: /капризн|гневлив/, r: 'mind anger children', c: 'mental', w: 2 },
    { p: /зябк|мёрзн|озноб|очень зябк/, r: 'generalities chilly', c: 'general', w: 2 },
    { p: /жарк|хуже.*тепл/, r: 'generalities warm aggravates', c: 'general', w: 2 },
    { p: /хуже.*утр/, r: 'generalities morning aggravates', c: 'general', w: 2 },
    { p: /хуже.*ночь|хуже.*после полуноч/, r: 'generalities night aggravates', c: 'general', w: 2 },
    { p: /2-?4 час.*ночи|просыпа.*2.*4/, r: 'sleep waking 2-4am', c: 'general', w: 3 },
    { p: /16.*20 час/, r: 'generalities afternoon 16-20h aggravates', c: 'general', w: 3 },
    { p: /слабост|истощен/, r: 'generalities weakness', c: 'general', w: 1 },
    { p: /жажд.*холодн.*большими/, r: 'stomach thirst large quantities cold', c: 'general', w: 3 },
    { p: /нет жажды|без жажды/, r: 'stomach thirstless', c: 'general', w: 3 },
    { p: /маленькими глотками/, r: 'stomach thirst small sips', c: 'general', w: 3 },
    { p: /любит солён/, r: 'generalities desire salt', c: 'general', w: 3 },
    { p: /любит сладк/, r: 'generalities desire sweets', c: 'general', w: 2 },
    { p: /лучше.*свеж.*воздух/, r: 'generalities open air ameliorates', c: 'general', w: 2 },
    { p: /хуже.*тёпл.*комнат/, r: 'generalities warm room aggravates', c: 'general', w: 2 },
    { p: /лучше.*движен|расходится/, r: 'generalities motion continued ameliorates', c: 'general', w: 3 },
    { p: /хуже.*движен|любое движение/, r: 'generalities motion aggravates', c: 'general', w: 3 },
    { p: /хуже.*покой/, r: 'generalities rest aggravates', c: 'general', w: 2 },
    { p: /хуже.*сыр.*погод/, r: 'generalities wet weather aggravates', c: 'general', w: 2 },
    { p: /лучше.*тепл|лучше.*грелк/, r: 'generalities warmth ameliorates', c: 'general', w: 2 },
    { p: /потеет.*голова.*ноч/, r: 'perspiration head night', c: 'general', w: 3 },
    { p: /головн.*бол/, r: 'head pain', c: 'particular', w: 1 },
    { p: /тошнот/, r: 'stomach nausea', c: 'particular', w: 1 },
    { p: /понос|диаре/, r: 'rectum diarrhea', c: 'particular', w: 1 },
    { p: /запор/, r: 'rectum constipation', c: 'particular', w: 1 },
    { p: /экзем|зуд.*кож/, r: 'skin eruptions eczema', c: 'particular', w: 2 },
    { p: /судорог|спазм/, r: 'generalities convulsions', c: 'particular', w: 2 },
    { p: /кровотечен/, r: 'generalities hemorrhage', c: 'particular', w: 2 },
    { p: /жжение стоп/, r: 'extremities burning feet', c: 'particular', w: 3 },
    { p: /пульсирующ.*головн/, r: 'head pain pulsating', c: 'particular', w: 2 },
    { p: /зрачки расширен/, r: 'eye pupils dilated', c: 'particular', w: 3 },
    { p: /герпес.*губ/, r: 'face eruptions herpes lips', c: 'particular', w: 3 },
    { p: /слюноотделен/, r: 'mouth salivation profuse', c: 'particular', w: 3 },
    { p: /одна щека красн/, r: 'face one cheek red other pale', c: 'particular', w: 3 },
    { p: /скрежещ.*зуб/, r: 'teeth grinding sleep', c: 'particular', w: 3 },
    { p: /ковыря.*нос/, r: 'nose picking', c: 'particular', w: 3 },
    { p: /справа|правая сторон/, r: 'generalities side right', c: 'particular', w: 2 },
    { p: /слев|левая сторон/, r: 'generalities side left', c: 'particular', w: 2 },
    { p: /рвот.*понос|понос.*рвот/, r: 'stomach vomiting diarrhea simultaneous', c: 'particular', w: 3 },
    { p: /холодн.*пот/, r: 'perspiration cold', c: 'general', w: 3 },
    { p: /коллапс/, r: 'generalities collapse', c: 'general', w: 3 },
    { p: /любит яйц/, r: 'generalities desire eggs', c: 'general', w: 3 },
    { p: /кислый запах/, r: 'generalities odor sour', c: 'general', w: 3 },
    { p: /колющ.*бол/, r: 'generalities pain stitching', c: 'particular', w: 2 },
    { p: /отёк.*век/, r: 'eye edema lids upper', c: 'particular', w: 3 },
    { p: /астма.*ноч/, r: 'respiration asthma night', c: 'particular', w: 3 },
  ]

  for (const m of MAPS) {
    if (m.p.test(lower)) {
      symptoms.push({ rubric: m.r, category: m.c, present: true, weight: m.w })
    }
  }

  if (/хуже.*тепл|хуже.*жар/.test(lower)) modalities.push({ pairId: 'heat_cold', value: 'agg' })
  if (/лучше.*тепл/.test(lower)) modalities.push({ pairId: 'heat_cold', value: 'amel' })
  if (/хуже.*движен/.test(lower)) modalities.push({ pairId: 'motion_rest', value: 'agg' })
  if (/лучше.*движен|расходится/.test(lower)) modalities.push({ pairId: 'motion_rest', value: 'amel' })
  if (/хуже.*утешен/.test(lower)) modalities.push({ pairId: 'consolation', value: 'agg' })

  return { symptoms, modalities }
}

async function main() {
  const data = await loadMDRIData()

  let hitBefore = 0, hitAfter = 0, top3Before = 0, top3After = 0
  const changes: string[] = []
  let arsCountBefore = 0, arsCountAfter = 0

  console.log('\n═══ IDF EFFECT TEST (15 кейсов) ═══\n')

  for (const c of CASES) {
    const { symptoms, modalities } = parse(c.text)
    if (symptoms.length === 0) { console.log(`#${c.id}: SKIP (no symptoms)`); continue }

    // Before: без IDF
    const before = analyzeRaw(data as any, symptoms, modalities, [], DEFAULT_PROFILE)
    // After: с IDF
    const normalizedSymptoms = applyIdfWeights(symptoms, data.repertory)
    const after = analyzeRaw(data as any, normalizedSymptoms, modalities, [], DEFAULT_PROFILE)

    const b1 = before[0]?.remedy.toLowerCase().replace(/\.$/, '') ?? ''
    const a1 = after[0]?.remedy.toLowerCase().replace(/\.$/, '') ?? ''
    const bHit = b1 === c.expected
    const aHit = a1 === c.expected
    if (bHit) hitBefore++
    if (aHit) hitAfter++

    // Top-3
    const bTop3 = before.slice(0, 3).some(r => r.remedy.toLowerCase().replace(/\.$/, '') === c.expected)
    const aTop3 = after.slice(0, 3).some(r => r.remedy.toLowerCase().replace(/\.$/, '') === c.expected)
    if (bTop3) top3Before++
    if (aTop3) top3After++

    // Ars count
    if (b1 === 'ars') arsCountBefore++
    if (a1 === 'ars') arsCountAfter++

    const changed = b1 !== a1
    const icon = changed ? (aHit ? '✅' : bHit ? '❌' : '🔄') : (bHit ? '✓' : '✗')
    const msg = `${icon} #${c.id} expected=${c.expected.padEnd(8)} before=${b1.padEnd(8)} after=${a1.padEnd(8)} ${changed ? '← CHANGED' : ''}`
    console.log(msg)

    if (changed) {
      // Показать какие веса изменились
      const diffs: string[] = []
      for (let i = 0; i < symptoms.length; i++) {
        if (symptoms[i].weight !== normalizedSymptoms[i].weight) {
          diffs.push(`  ${symptoms[i].rubric}: w=${symptoms[i].weight} → w=${normalizedSymptoms[i].weight}`)
        }
      }
      if (diffs.length) {
        console.log('  Weight changes:')
        diffs.forEach(d => console.log(d))
      }
      changes.push(msg)
    }
  }

  console.log('\n═══ SUMMARY ═══')
  console.log(`Top-1 before: ${hitBefore}/${CASES.length} (${Math.round(hitBefore/CASES.length*100)}%)`)
  console.log(`Top-1 after:  ${hitAfter}/${CASES.length} (${Math.round(hitAfter/CASES.length*100)}%)`)
  console.log(`Top-3 before: ${top3Before}/${CASES.length} (${Math.round(top3Before/CASES.length*100)}%)`)
  console.log(`Top-3 after:  ${top3After}/${CASES.length} (${Math.round(top3After/CASES.length*100)}%)`)
  console.log(`Ars as top-1 before: ${arsCountBefore}`)
  console.log(`Ars as top-1 after:  ${arsCountAfter}`)
  console.log(`Changes: ${changes.length}`)
}

main().catch(console.error)
