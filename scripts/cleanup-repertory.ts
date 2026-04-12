/**
 * Чистка repertory.json:
 *   - удалить немецкие параллельные рубрики (OOREP двуязычный — в русскоязычном
 *     workflow symMatch ищет английские слова)
 *   - дедуплицировать полные дубли (одинаковый fullpath + одинаковые remedies)
 *   - смерджить дубли с разными remedies (union по abbrev, max grade)
 *   - удалить баг-импорты (препарат в хвосте fullpath, например
 *     "Mind, Delirium, acon.")
 *
 * Делает бэкап перед записью. Идемпотентный: повторный запуск ничего не меняет.
 *
 * Запуск: `npx tsx scripts/cleanup-repertory.ts`
 */
import { readFileSync, writeFileSync, copyFileSync, existsSync } from 'fs'
import { join } from 'path'

type Remedy = { abbrev: string; grade: number }
type Rubric = { fullpath: string; chapter?: string; remedies: Remedy[] }

const PATH = join(process.cwd(), 'src', 'lib', 'mdri', 'data', 'repertory.json')
const BACKUP = PATH + '.backup-before-cleanup'

// Немецкие заголовки глав Kent-репертория (OOREP параллельный перевод)
const GERMAN_FIRST_WORDS = new Set([
  'Extremitäten', 'Gemüt', 'Kopf', 'Rücken', 'Bauch', 'Brust', 'Auge',
  'Ohr', 'Nase', 'Zähne', 'Haut', 'Schlaf', 'Magen', 'Rectum', 'Hals',
  'Gesicht', 'Stuhl', 'Harn', 'Fieber', 'Verallgemeinerungen',
  'Weibliche', 'Männliche', 'Respiration', 'Husten', 'Schwindel',
  'Expectoration', 'Larynx', 'Schweiss', 'Kehle', 'Nieren', 'Blase',
  'Allgemeines', 'Mund', 'Geschlechtsorgane weiblich',
  'Geschlechtsorgane männlich', 'Mastdarm', 'Sehen', 'Frost',
  'Atmung', 'Kehlkopf und Luftröhre', 'Harnröhre', 'Nase',
  'Auswurf', 'Zähne', 'Ohren',
])

function isGerman(fullpath: string): boolean {
  const first = fullpath.split(',')[0].trim()
  return GERMAN_FIRST_WORDS.has(first)
}

function signature(remedies: Remedy[]): string {
  return remedies.map(r => `${r.abbrev.toLowerCase()}:${r.grade}`).sort().join(',')
}

function main() {
  console.log('Загрузка repertory.json...')
  const rep: Rubric[] = JSON.parse(readFileSync(PATH, 'utf-8'))
  console.log(`Исходно: ${rep.length} записей`)

  // === Шаг 1: backup ===
  if (!existsSync(BACKUP)) {
    copyFileSync(PATH, BACKUP)
    console.log(`Backup создан: ${BACKUP}`)
  } else {
    console.log(`Backup уже существует (не перезаписываем): ${BACKUP}`)
  }

  // === Шаг 2: собрать список известных аббревиатур для детекции баг-импорта ===
  const knownAbbrevs = new Set<string>()
  for (const r of rep) {
    for (const rem of r.remedies || []) {
      const k = rem.abbrev.toLowerCase().replace(/\.$/, '').trim()
      if (k.length >= 2 && k.length <= 10) knownAbbrevs.add(k)
    }
  }
  console.log(`Известных аббревиатур препаратов: ${knownAbbrevs.size}`)

  // === Шаг 3: Фильтр + классификация ===
  let removedGerman = 0
  let removedBugImport = 0
  let removedEmpty = 0
  const kept: Rubric[] = []

  for (const r of rep) {
    const fp = (r.fullpath || '').trim()
    if (fp.length < 5) { removedEmpty++; continue }
    if (!r.remedies || r.remedies.length === 0) { removedEmpty++; continue }

    if (isGerman(fp)) { removedGerman++; continue }

    // Баг импорта: последний сегмент fullpath — это аббревиатура препарата
    const parts = fp.toLowerCase().split(',').map(p => p.trim().replace(/\.$/, ''))
    const lastPart = parts[parts.length - 1]
    if (knownAbbrevs.has(lastPart) && parts.length >= 2) {
      // Страховка: убедиться что это действительно мусор, а не слово типа "Sulph"
      // в контексте (например, "Head, pain, sulph-like" не должно попасть).
      // Kent-реперторий не имеет рубрик с аббревиатурами на конце — в ~99% это мусор.
      removedBugImport++
      continue
    }

    kept.push(r)
  }

  console.log('\n=== ПОСЛЕ ФИЛЬТРА ===')
  console.log(`  Удалено немецких:      ${removedGerman}`)
  console.log(`  Удалено баг-импортов:  ${removedBugImport}`)
  console.log(`  Удалено пустых/коротких: ${removedEmpty}`)
  console.log(`  Осталось:              ${kept.length}`)

  // === Шаг 4: Дедупликация + merge ===
  const byPath = new Map<string, Rubric>()
  let fullDupes = 0
  let mergedDupes = 0
  let mergedRemediesAdded = 0

  for (const r of kept) {
    const key = r.fullpath
    const existing = byPath.get(key)
    if (!existing) {
      byPath.set(key, { fullpath: r.fullpath, remedies: [...(r.remedies || [])] })
      continue
    }
    // Уже есть — сравниваем remedies
    if (signature(existing.remedies) === signature(r.remedies || [])) {
      fullDupes++
      continue
    }
    // Merge: union по abbrev, max grade
    const byAbbrev = new Map<string, Remedy>()
    for (const rem of existing.remedies) {
      byAbbrev.set(rem.abbrev.toLowerCase(), rem)
    }
    let added = 0
    for (const rem of r.remedies || []) {
      const k = rem.abbrev.toLowerCase()
      const prev = byAbbrev.get(k)
      if (!prev) {
        byAbbrev.set(k, rem)
        added++
      } else if (rem.grade > prev.grade) {
        byAbbrev.set(k, rem)
      }
    }
    existing.remedies = [...byAbbrev.values()]
    mergedDupes++
    mergedRemediesAdded += added
  }

  const cleaned = [...byPath.values()]
  console.log('\n=== ДЕДУПЛИКАЦИЯ ===')
  console.log(`  Полных дублей удалено: ${fullDupes}`)
  console.log(`  Смерджено рубрик:      ${mergedDupes} (добавлено remedies: ${mergedRemediesAdded})`)
  console.log(`  ИТОГО чистых рубрик:   ${cleaned.length}`)

  // === Шаг 5: Запись ===
  const sizeBefore = JSON.stringify(rep).length
  const out = JSON.stringify(cleaned)
  writeFileSync(PATH, out)
  console.log(`\nРазмер файла: ${(sizeBefore / 1024 / 1024).toFixed(1)} MB → ${(out.length / 1024 / 1024).toFixed(1)} MB`)
  console.log(`Сэкономлено: ${((sizeBefore - out.length) / 1024 / 1024).toFixed(1)} MB`)
  console.log(`\nЧтобы откатить: cp ${BACKUP} ${PATH}`)
}

main()
