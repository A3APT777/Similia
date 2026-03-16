// Заполняет колонку fullpath_ru переводами из словаря (пакетно)
// Запуск: node scripts/fill-fullpath-ru.mjs

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

const envPath = resolve(__dirname, '..', '.env.local')
const envContent = readFileSync(envPath, 'utf-8')
const env = {}
for (const line of envContent.split('\n')) {
  const match = line.match(/^([^=]+)=(.*)$/)
  if (match) env[match[1].trim()] = match[2].trim()
}

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

// Извлекаем словарь из .ts файла
const tsPath = resolve(__dirname, '..', 'src', 'lib', 'repertory-translations.ts')
const tsContent = readFileSync(tsPath, 'utf-8')

function extractObject(content, pattern) {
  const start = content.indexOf(pattern)
  if (start === -1) throw new Error(`Не найден: ${pattern}`)
  let braceCount = 0, objStart = -1
  for (let i = start; i < content.length; i++) {
    if (content[i] === '{') { if (objStart === -1) objStart = i; braceCount++ }
    else if (content[i] === '}') { braceCount--; if (braceCount === 0) {
      const s = content.slice(objStart, i+1).replace(/\/\/[^\n]*/g,'').replace(/\/\*[\s\S]*?\*\//g,'')
      return new Function(`return (${s})`)()
    }}
  }
}

const T = extractObject(tsContent, 'const T: Record<string, string> = {')
const CHAPTER_NAMES = extractObject(tsContent, 'export const CHAPTER_NAMES: Record<string, string> = {')
console.log(`Словарь: ${Object.keys(T).length} записей`)

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
      if (T[phrase] !== undefined) { if (T[phrase]) result.push(T[phrase]); i += len; matched = true; break }
    }
    if (!matched) {
      const raw = words[i]
      const leading = raw.match(/^[(\[{]+/)?.[0] || ''
      const trailing = raw.match(/[)\]}.,:;!?]+$/)?.[0] || ''
      const core = raw.slice(leading.length, raw.length - (trailing.length || 0))
      const w = core.toLowerCase()
      const translated = T[w]
      if (translated !== undefined) { if (translated) result.push(leading + translated + trailing) }
      else result.push(raw)
      i++
    }
  }
  return result.join(' ').replace(/\s+/g, ' ').trim()
}

function translateRubric(fullpath, chapter) {
  if (fullpath === chapter) return CHAPTER_NAMES[chapter] || chapter
  const prefix = chapter + ', '
  const w = fullpath.startsWith(prefix) ? fullpath.slice(prefix.length) : fullpath
  return w.split(', ').map(s => translateSegment(s)).join(', ').replace(/\s{2,}/g,' ').trim()
}

async function main() {
  console.log('Загрузка и перевод рубрик...')

  const PAGE_SIZE = 1000
  const BATCH_SIZE = 200 // обновляем по 200 параллельно
  let offset = 0
  let totalUpdated = 0

  while (true) {
    const { data, error } = await supabase
      .from('repertory_rubrics')
      .select('id, fullpath, chapter')
      .range(offset, offset + PAGE_SIZE - 1)

    if (error) { console.error('Ошибка загрузки:', error.message); process.exit(1) }
    if (!data || data.length === 0) break

    // Переводим
    const updates = data.map(r => ({
      id: r.id,
      fullpath_ru: translateRubric(r.fullpath, r.chapter)
    }))

    // Обновляем пакетами по BATCH_SIZE параллельных запросов
    for (let i = 0; i < updates.length; i += BATCH_SIZE) {
      const batch = updates.slice(i, i + BATCH_SIZE)
      await Promise.all(batch.map(item =>
        supabase
          .from('repertory_rubrics')
          .update({ fullpath_ru: item.fullpath_ru })
          .eq('id', item.id)
      ))
    }

    totalUpdated += data.length
    console.log(`  ${totalUpdated} / ~74482 рубрик обновлено`)

    if (data.length < PAGE_SIZE) break
    offset += PAGE_SIZE
  }

  console.log(`\nГотово! Обновлено ${totalUpdated} рубрик.`)
}

main().catch(err => { console.error('Фатальная ошибка:', err); process.exit(1) })
