// Скрипт для поиска непереведённых английских слов в рубриках репертория.
// Читает словарь прямо из repertory-translations.ts (не копия!)
// Запуск: node scripts/find-untranslated.mjs

import { createClient } from '@supabase/supabase-js'
import { readFileSync, writeFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

// ── Читаем .env.local ──────────────────────────────────────────────────
const envPath = resolve(__dirname, '..', '.env.local')
const envContent = readFileSync(envPath, 'utf-8')
const env = {}
for (const line of envContent.split('\n')) {
  const match = line.match(/^([^=]+)=(.*)$/)
  if (match) env[match[1].trim()] = match[2].trim()
}

const SUPABASE_URL = env['NEXT_PUBLIC_SUPABASE_URL']
const SUPABASE_KEY = env['SUPABASE_SERVICE_ROLE_KEY']

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Не найдены NEXT_PUBLIC_SUPABASE_URL или SUPABASE_SERVICE_ROLE_KEY в .env.local')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

// ── Динамически извлекаем словарь из .ts файла ─────────────────────────
const tsPath = resolve(__dirname, '..', 'src', 'lib', 'repertory-translations.ts')
const tsContent = readFileSync(tsPath, 'utf-8')

// Извлекаем объект T
function extractObject(content, pattern) {
  const start = content.indexOf(pattern)
  if (start === -1) throw new Error(`Не найден паттерн: ${pattern}`)
  let braceCount = 0
  let objStart = -1
  for (let i = start; i < content.length; i++) {
    if (content[i] === '{') {
      if (objStart === -1) objStart = i
      braceCount++
    } else if (content[i] === '}') {
      braceCount--
      if (braceCount === 0) {
        const objStr = content.slice(objStart, i + 1)
        // Убираем TypeScript типы и комментарии
        const cleaned = objStr
          .replace(/\/\/[^\n]*/g, '') // однострочные комментарии
          .replace(/\/\*[\s\S]*?\*\//g, '') // многострочные комментарии
        return new Function(`return (${cleaned})`)()
      }
    }
  }
  throw new Error(`Не удалось найти конец объекта для: ${pattern}`)
}

const T = extractObject(tsContent, 'const T: Record<string, string> = {')
const CHAPTER_NAMES = extractObject(tsContent, 'export const CHAPTER_NAMES: Record<string, string> = {')

console.log(`Словарь T: ${Object.keys(T).length} записей`)
console.log(`CHAPTER_NAMES: ${Object.keys(CHAPTER_NAMES).length} записей`)

// ── Функция перевода сегмента ───────────────────────────────────────────
function translateSegment(segment) {
  const trimmed = segment.trim()
  const lower = trimmed.toLowerCase()

  if (T[lower]) return T[lower]

  const words = trimmed.split(/\s+/)
  const result = []
  let i = 0

  while (i < words.length) {
    let matched = false
    for (let len = Math.min(words.length - i, 4); len >= 2; len--) {
      const phrase = words.slice(i, i + len).join(' ').toLowerCase()
      if (T[phrase] !== undefined) {
        const translated = T[phrase]
        if (translated) result.push(translated)
        i += len
        matched = true
        break
      }
    }
    if (!matched) {
      const raw = words[i]
      const leading = raw.match(/^[(\[{]+/)?.[0] || ''
      const trailing = raw.match(/[)\]}.,:;!?]+$/)?.[0] || ''
      const core = raw.slice(leading.length, raw.length - (trailing.length || 0))
      const w = core.toLowerCase()
      const translated = T[w]
      if (translated !== undefined) {
        if (translated) result.push(leading + translated + trailing)
      } else {
        result.push(raw)
      }
      i++
    }
  }

  return result.join(' ').replace(/\s+/g, ' ').trim()
}

function translateRubric(fullpath, chapter) {
  if (fullpath === chapter) {
    return CHAPTER_NAMES[chapter] || chapter
  }

  const prefix = chapter + ', '
  const withoutChapter = fullpath.startsWith(prefix)
    ? fullpath.slice(prefix.length)
    : fullpath

  return withoutChapter
    .split(', ')
    .map(seg => translateSegment(seg))
    .join(', ')
    .replace(/\s{2,}/g, ' ')
    .trim()
}

// ── Основная логика ─────────────────────────────────────────────────────
async function main() {
  console.log('\nЗагрузка рубрик из Supabase...')

  const PAGE_SIZE = 1000
  let allRubrics = []
  let offset = 0

  while (true) {
    const { data, error } = await supabase
      .from('repertory_rubrics')
      .select('fullpath, chapter')
      .range(offset, offset + PAGE_SIZE - 1)

    if (error) {
      console.error('Ошибка загрузки:', error.message)
      process.exit(1)
    }

    if (!data || data.length === 0) break
    allRubrics = allRubrics.concat(data)
    if (allRubrics.length % 10000 === 0) console.log(`  Загружено ${allRubrics.length} рубрик...`)

    if (data.length < PAGE_SIZE) break
    offset += PAGE_SIZE
  }

  console.log(`Всего рубрик: ${allRubrics.length}`)

  const latinWordRegex = /[a-zA-Z]{2,}/g
  const wordFrequency = {}
  let rubricWithEnglishCount = 0

  for (const rubric of allRubrics) {
    const translated = translateRubric(rubric.fullpath, rubric.chapter)
    const matches = translated.match(latinWordRegex)
    if (matches && matches.length > 0) {
      rubricWithEnglishCount++
      for (const word of matches) {
        const lower = word.toLowerCase()
        wordFrequency[lower] = (wordFrequency[lower] || 0) + 1
      }
    }
  }

  const sorted = Object.entries(wordFrequency).sort((a, b) => b[1] - a[1])

  console.log(`Рубрик с оставшимися англ. словами: ${rubricWithEnglishCount}`)
  console.log(`Уникальных непереведённых слов: ${sorted.length}`)
  console.log(`\n── Топ-50 самых частых непереведённых слов ──\n`)

  for (const [word, count] of sorted.slice(0, 50)) {
    console.log(`  ${String(count).padStart(6)}  ${word}`)
  }

  const outputPath = resolve(__dirname, 'untranslated-words.json')
  writeFileSync(outputPath, JSON.stringify({
    totalRubrics: allRubrics.length,
    rubricsWithEnglish: rubricWithEnglishCount,
    uniqueWords: sorted.length,
    words: sorted.map(([word, count]) => ({ word, count })),
  }, null, 2), 'utf-8')
  console.log(`\nПолный список сохранён в: ${outputPath}`)
}

main().catch(err => {
  console.error('Фатальная ошибка:', err)
  process.exit(1)
})
