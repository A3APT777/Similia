/**
 * Парсинг реперториума Boericke из HTML → JSON для MDRI engine
 * Источник: http://www.homeoint.org/books4/boerirep/
 * Public domain (1927)
 */
import { readFileSync, writeFileSync } from 'fs'
import { join } from 'path'

type Remedy = { abbrev: string; grade: number }
type Rubric = { fullpath: string; remedies: Remedy[] }

// Нормализация аббревиатуры средства
function normalizeAbbrev(raw: string): string {
  return raw.trim()
    .replace(/\s+/g, ' ')
    .replace(/,$/, '')
    .replace(/\.$/, '')
    .trim()
    + '.'
}

// Парсинг средств из текста рубрики
// Boericke формат: средства через запятую
// bold/CAPS/blue = grade 3, italic = grade 2, plain = grade 1
function parseRemediesFromHTML(html: string): Remedy[] {
  const remedies: Remedy[] = []
  const seen = new Set<string>()

  // Grade 3: bold или blue color
  const boldPattern = /<b>([^<]+)<\/b>/gi
  const bluePattern = /<font[^>]*color="#0000ff"[^>]*>([^<]+)<\/font>/gi

  // Извлекаем grade 3 (bold)
  let match
  while ((match = boldPattern.exec(html)) !== null) {
    const names = match[1].split(/,/).map(s => s.trim()).filter(s => s.length > 1 && /^[A-Z]/.test(s))
    for (const name of names) {
      const abbrev = normalizeAbbrev(name)
      if (abbrev.length > 2 && !seen.has(abbrev.toLowerCase())) {
        remedies.push({ abbrev, grade: 3 })
        seen.add(abbrev.toLowerCase())
      }
    }
  }

  // Grade 3: blue font
  while ((match = bluePattern.exec(html)) !== null) {
    const names = match[1].split(/,/).map(s => s.trim()).filter(s => s.length > 1 && /^[A-Z]/.test(s))
    for (const name of names) {
      const abbrev = normalizeAbbrev(name)
      if (abbrev.length > 2 && !seen.has(abbrev.toLowerCase())) {
        remedies.push({ abbrev, grade: 2 }) // blue = grade 2 в Boericke
        seen.add(abbrev.toLowerCase())
      }
    }
  }

  // Grade 2: italic
  const italicPattern = /<i>([^<]+)<\/i>/gi
  while ((match = italicPattern.exec(html)) !== null) {
    const names = match[1].split(/,/).map(s => s.trim()).filter(s => s.length > 1 && /^[A-Z]/.test(s))
    for (const name of names) {
      const abbrev = normalizeAbbrev(name)
      if (abbrev.length > 2 && !seen.has(abbrev.toLowerCase())) {
        remedies.push({ abbrev, grade: 2 })
        seen.add(abbrev.toLowerCase())
      }
    }
  }

  // Grade 1: обычный текст — всё что осталось
  const plainText = html
    .replace(/<b>[^<]*<\/b>/gi, '')
    .replace(/<i>[^<]*<\/i>/gi, '')
    .replace(/<font[^>]*>[^<]*<\/font>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')

  const plainNames = plainText.split(/,/).map(s => s.trim()).filter(s => s.length > 1 && /^[A-Z]/.test(s))
  for (const name of plainNames) {
    const abbrev = normalizeAbbrev(name)
    if (abbrev.length > 2 && abbrev.length < 20 && !seen.has(abbrev.toLowerCase())) {
      remedies.push({ abbrev, grade: 1 })
      seen.add(abbrev.toLowerCase())
    }
  }

  return remedies
}

// Парсинг одной главы
function parseChapter(filename: string, chapterName: string): Rubric[] {
  const html = readFileSync(join('/tmp/boericke', filename), 'utf-8')
  const rubrics: Rubric[] = []

  // Разбиваем по anchor names — каждый anchor = секция верхнего уровня
  // Внутри секции: подрубрики разделены <p> или <br> с дефисом
  const anchorSections = html.split(/<a\s+name="/i).slice(1)

  for (const section of anchorSections) {
    const nameMatch = section.match(/^([^"]+)"/)
    if (!nameMatch) continue
    const sectionName = nameMatch[1]

    // Разбиваем секцию на подрубрики по pattern " -- " (двойной дефис = суб-рубрика)
    const subParts = section.split(/\s--\s/)

    for (let i = 0; i < subParts.length; i++) {
      const part = subParts[i]
      if (i === 0) {
        // Первая часть — заголовок секции, может содержать средства
        const remedies = parseRemediesFromHTML(part)
        if (remedies.length > 0) {
          const rubricName = sectionName.charAt(0).toUpperCase() + sectionName.slice(1)
          rubrics.push({
            fullpath: `${chapterName}, ${rubricName}`,
            remedies,
          })
        }
        continue
      }

      // Суб-рубрики: текст до первого средства = название
      const textOnly = part.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim()
      const firstComma = textOnly.indexOf(',')
      const subName = firstComma > 0 ? textOnly.slice(0, firstComma).trim() : textOnly.slice(0, 40).trim()

      if (!subName || subName.length < 2) continue

      const remedies = parseRemediesFromHTML(part)
      if (remedies.length > 0) {
        const sectionTitle = sectionName.charAt(0).toUpperCase() + sectionName.slice(1)
        rubrics.push({
          fullpath: `${chapterName}, ${sectionTitle}, ${subName.toLowerCase()}`,
          remedies,
        })
      }
    }
  }

  return rubrics
}

// Маппинг файлов → глав
const CHAPTERS: [string, string][] = [
  ['mind.htm', 'Mind'],
  ['head.htm', 'Head'],
  ['eyes.htm', 'Eye'],
  ['ears.htm', 'Ear'],
  ['nose.htm', 'Nose'],
  ['face.htm', 'Face'],
  ['mouth.htm', 'Mouth'],
  ['tongue.htm', 'Tongue'],
  ['taste.htm', 'Taste'],
  ['gums.htm', 'Gums'],
  ['teeth.htm', 'Teeth'],
  ['throat.htm', 'Throat'],
  ['stomach.htm', 'Stomach'],
  ['abdomen.htm', 'Abdomen'],
  ['urinary.htm', 'Urinary'],
  ['male.htm', 'Genitalia male'],
  ['female.htm', 'Genitalia female'],
  ['circulatory.htm', 'Heart & Circulation'],
  ['locomotor.htm', 'Extremities'],
  ['respiratory.htm', 'Respiration'],
  ['skin.htm', 'Skin'],
  ['fever.htm', 'Fever'],
  ['nervous.htm', 'Nervous system'],
  ['general.htm', 'Generalities'],
  ['modalities.htm', 'Modalities'],
]

// Парсим все главы
let allRubrics: Rubric[] = []
let totalRemedies = 0

for (const [file, chapter] of CHAPTERS) {
  const rubrics = parseChapter(file, chapter)
  allRubrics.push(...rubrics)
  const remedyCount = rubrics.reduce((sum, r) => sum + r.remedies.length, 0)
  totalRemedies += remedyCount
  console.log(`${chapter.padEnd(20)} ${rubrics.length} rubrics, ${remedyCount} remedy entries`)
}

console.log(`\n=== ИТОГО ===`)
console.log(`Рубрик: ${allRubrics.length}`)
console.log(`Пар рубрика-средство: ${totalRemedies}`)

// Уникальные средства
const uniqueRemedies = new Set<string>()
for (const r of allRubrics) {
  for (const rem of r.remedies) {
    uniqueRemedies.add(rem.abbrev.toLowerCase().replace(/\.$/, ''))
  }
}
console.log(`Уникальных средств: ${uniqueRemedies.size}`)

// Сохраняем
writeFileSync('/tmp/boericke-parsed.json', JSON.stringify(allRubrics, null, 2))
console.log(`\nСохранено: /tmp/boericke-parsed.json`)

// Примеры
console.log(`\nПримеры:`)
for (const r of allRubrics.slice(0, 5)) {
  console.log(`  ${r.fullpath} — ${r.remedies.length} средств (top: ${r.remedies.slice(0, 3).map(rem => rem.abbrev + '(g' + rem.grade + ')').join(', ')})`)
}
