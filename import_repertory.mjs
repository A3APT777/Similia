import { createClient } from '@supabase/supabase-js'
import zlib from 'zlib'
import fs from 'fs'

const supabase = createClient(
  'https://obcbinbhurokubvbsgjx.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9iY2JpbmJodXJva3VidmJzZ2p4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzU5MTM4OSwiZXhwIjoyMDg5MTY3Mzg5fQ.e7g4Dlm8npJkTNbE3Ak79WFEHHImVGKJhsTUpOAfF5g'
)

console.log('Читаю SQL дамп...')
const data = zlib.gunzipSync(fs.readFileSync('oorep.sql.gz')).toString('utf8')
console.log('Готово. Размер:', Math.round(data.length / 1024 / 1024), 'MB')

// ── 1. Remedies: id → {abbrev, namelong}
function extractCopyBlock(data, tableName) {
  const marker = `COPY public.${tableName} (`
  const start = data.indexOf(marker)
  if (start === -1) return []
  const lineStart = data.indexOf('\n', start) + 1
  const end = data.indexOf('\n\\.\n', lineStart)
  return data.slice(lineStart, end).split('\n').filter(Boolean)
}

console.log('Парсю препараты...')
const remedyMap = new Map() // id → {abbrev, namelong}
extractCopyBlock(data, 'remedy').forEach(l => {
  const [id, nameabbrev, namelong] = l.split('\t')
  remedyMap.set(parseInt(id), { abbrev: nameabbrev, name: namelong })
})
console.log('Препаратов:', remedyMap.size)

// ── 2. RubricRemedy for publicum: rubricid → [{remedyId, grade}]
console.log('Парсю связи рубрика-препарат...')
const rrMap = new Map() // rubricId → [{remedyId, grade}]
extractCopyBlock(data, 'rubricremedy').forEach(l => {
  const [abbrev, rubricid, remedyid, weight] = l.split('\t')
  if (abbrev !== 'publicum') return
  const rid = parseInt(rubricid)
  const remedy = { remedyId: parseInt(remedyid), grade: parseInt(weight) }
  if (!rrMap.has(rid)) rrMap.set(rid, [])
  rrMap.get(rid).push(remedy)
})
console.log('Рубрик с препаратами:', rrMap.size)

// ── 3. Rubrics for publicum (only with remedies)
console.log('Парсю рубрики...')
const rubrics = []
extractCopyBlock(data, 'rubric').forEach(l => {
  const parts = l.split('\t')
  if (parts[0] !== 'publicum') return
  const id = parseInt(parts[1])
  if (!rrMap.has(id)) return // пропускаем без препаратов

  const fullpath = parts[5]
  if (!fullpath || fullpath === '\\N') return

  // Глава = первое слово до запятой
  const chapter = fullpath.split(',')[0].trim()

  // Строим массив препаратов с градацией
  const remedies = (rrMap.get(id) || [])
    .map(r => {
      const rem = remedyMap.get(r.remedyId)
      if (!rem) return null
      return { name: rem.name, abbrev: rem.abbrev, grade: r.grade }
    })
    .filter(Boolean)
    .sort((a, b) => b.grade - a.grade)

  if (remedies.length === 0) return

  rubrics.push({
    source: 'publicum',
    chapter,
    fullpath,
    remedies,
    remedy_count: remedies.length,
  })
})
console.log('Рубрик для импорта:', rubrics.length)

// ── 4. Insert in batches
const BATCH = 500
let inserted = 0
let errors = 0

console.log('Начинаю импорт...')

// Сначала очищаем старые данные если есть
await supabase.from('repertory_rubrics').delete().eq('source', 'publicum')

for (let i = 0; i < rubrics.length; i += BATCH) {
  const batch = rubrics.slice(i, i + BATCH)
  const { error } = await supabase.from('repertory_rubrics').insert(batch)
  if (error) {
    errors++
    if (errors <= 3) console.error('Ошибка батча:', error.message)
  } else {
    inserted += batch.length
  }
  if (i % 5000 === 0) {
    console.log(`  ${inserted}/${rubrics.length} (${Math.round(inserted/rubrics.length*100)}%)`)
  }
}

console.log(`✓ Импорт завершён: ${inserted} рубрик, ${errors} ошибок батчей`)

// Показываем уникальные главы
const { data: chapters } = await supabase
  .from('repertory_rubrics')
  .select('chapter')
  .eq('source', 'publicum')
  .limit(1000)

const uniqueChapters = [...new Set((chapters || []).map(c => c.chapter))].sort()
console.log('Главы (' + uniqueChapters.length + '):', uniqueChapters.slice(0, 30))
