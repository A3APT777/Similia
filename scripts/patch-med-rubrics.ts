/**
 * Патч реперториума: восстановление классических keynote-рубрик для
 * препаратов, которые проваливаются в тесте из-за дыр в данных.
 *
 * Контекст: прогон test-50-full-pipeline.ts 12.04.2026 показал два чистых
 * data gap — #31 Med (сон на животе + море) и #28 Tab (укачивание + deathly
 * pallor + cold sweat forehead). Рубрики в реперториуме есть не везде, где
 * нужно, и часть grade занижены относительно Kent/Allen/Vermeulen/Morrison.
 *
 * Запуск: `npx tsx scripts/patch-med-rubrics.ts`
 * Идемпотентный: повторный запуск ничего не меняет.
 */
import { readFileSync, writeFileSync } from 'fs'
import { join } from 'path'

type Rubric = { fullpath: string; chapter?: string; remedies: Array<{ abbrev: string; grade: number }> }

const PATH = join(process.cwd(), 'src', 'lib', 'mdri', 'data', 'repertory.json')

type Patch = { match: RegExp; abbrev: string; grade: number; note: string }

const PATCHES: Patch[] = [
  // Сон на животе — cardinal keynote Medorrhinum
  { match: /^Sleep, position, abdomen$/i, abbrev: 'med.', grade: 3, note: 'Med grade 3: классический keynote Medorrhinum (Kent/Allen/Vermeulen)' },
  { match: /^Sleep, position, abdomen, on$/i, abbrev: 'med.', grade: 3, note: 'Med grade 3: вариант той же рубрики' },
  { match: /^Sleep, position, abdomen, on, with one arm under the head$/i, abbrev: 'med.', grade: 3, note: 'Med grade 3: peculiar variant, почти уникально для Med' },
  { match: /^Sleep, position, arms, on abdomen$/i, abbrev: 'med.', grade: 2, note: 'Med grade 2: смежный keynote' },

  // Море лучше — второй кардинальный keynote Med
  { match: /^Generalities, air, seashore, amel\.$/i, abbrev: 'med.', grade: 3, note: 'Med grade 3: ключевой генерал, был grade 1 — поднимаем до 3' },
  { match: /^Mind, seaside, amel\. mental symptoms$/i, abbrev: 'med.', grade: 3, note: 'Med grade 3: ментальное улучшение у моря' },

  // Tabacum — укачивание, кардинальный keynote
  { match: /^Stomach, nausea, motion$/i, abbrev: 'tab.', grade: 3, note: 'Tab grade 3: укачивание — один из трёх основных keynote Tab (был grade 2)' },
  { match: /^Stomach, nausea, motion, on agg\.$/i, abbrev: 'tab.', grade: 3, note: 'Tab grade 3: вариант той же рубрики' },
  { match: /^Vertigo, motion$/i, abbrev: 'tab.', grade: 3, note: 'Tab grade 3: головокружение при движении — cardinal keynote (был grade 1)' },
  { match: /^Generalities, motion, agg\.$/i, abbrev: 'tab.', grade: 3, note: 'Tab grade 3: общее ухудшение при движении (отсутствовал)' },

  // Tab — холодный пот с тошнотой/головокружением (ледяной пот — кардинал)
  { match: /^Perspiration, cold, nausea and vertigo, with$/i, abbrev: 'tab.', grade: 3, note: 'Tab grade 3: ледяной пот с тошнотой и головокружением — cardinal' },
  { match: /^Head, perspiration, forehead, cold$/i, abbrev: 'tab.', grade: 3, note: 'Tab grade 3: холодный пот на лбу (был grade 2)' },

  // Tab — peculiar: хуже от открытия/движения глаз (классический discriminator от Ip)
  { match: /^Stomach, nausea, motion, of eyes agg\.$/i, abbrev: 'tab.', grade: 3, note: 'Tab grade 3: peculiar keynote — тошнота хуже от движения глаз (Ip этого не имеет)' },

  // Tab — sinking in stomach (upgrade)
  { match: /^Stomach, sinking$/i, abbrev: 'tab.', grade: 3, note: 'Tab grade 3: sinking feeling — cardinal (был grade 2)' },
]

function main() {
  console.log('Загрузка repertory.json...')
  const rep: Rubric[] = JSON.parse(readFileSync(PATH, 'utf-8'))
  console.log(`Рубрик: ${rep.length}`)

  let added = 0, upgraded = 0, skipped = 0
  const touched: string[] = []

  for (const r of rep) {
    for (const p of PATCHES) {
      if (!p.match.test(r.fullpath)) continue
      const existing = r.remedies.find(x => x.abbrev.toLowerCase() === p.abbrev.toLowerCase())
      if (existing) {
        if (existing.grade < p.grade) {
          console.log(`UPGRADE  ${r.fullpath.padEnd(80)} | ${p.abbrev} ${existing.grade} → ${p.grade}`)
          existing.grade = p.grade
          upgraded++
          touched.push(r.fullpath)
        } else {
          skipped++
        }
      } else {
        console.log(`ADD      ${r.fullpath.padEnd(80)} | ${p.abbrev} grade ${p.grade}`)
        r.remedies.push({ abbrev: p.abbrev, grade: p.grade })
        added++
        touched.push(r.fullpath)
      }
    }
  }

  console.log('')
  console.log(`Added:    ${added}`)
  console.log(`Upgraded: ${upgraded}`)
  console.log(`Skipped:  ${skipped} (уже выставлены корректно)`)

  if (added + upgraded > 0) {
    console.log('\nСохранение repertory.json...')
    writeFileSync(PATH, JSON.stringify(rep))
    console.log(`Записано. Затронуто ${touched.length} rubric-строк.`)
  } else {
    console.log('\nБез изменений.')
  }
}

main()
