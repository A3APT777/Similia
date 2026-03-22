const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!URL || !KEY) { console.error('Missing env'); process.exit(0) }

const supabase = createClient(URL, KEY)

async function main() {
  console.log('[prebuild] Start')

  // Реперториум — пагинация по 1000 (default limit)
  const rubrics = []
  let from = 0
  while (true) {
    const { data } = await supabase
      .from('repertory_rubrics')
      .select('fullpath, chapter, remedies')
      .in('source', ['publicum', 'kent'])
      .range(from, from + 999)
    if (!data || data.length === 0) break
    rubrics.push(...data)
    from += data.length
    console.log(`[prebuild] Rubrics: ${rubrics.length}`)
    if (data.length < 1000) break
  }

  // Constellations — пагинация
  const cons = []
  from = 0
  while (true) {
    const { data } = await supabase.from('mdri_constellations').select('*').range(from, from + 999)
    if (!data || data.length === 0) break
    cons.push(...data)
    from += data.length
    if (data.length < 1000) break
  }

  // Polarities
  const { data: pols } = await supabase.from('mdri_polarities').select('*').range(0, 999)

  // Clinical
  const { data: clinical } = await supabase.from('mdri_clinical_data').select('type, data').range(0, 499)

  const outDir = path.join(__dirname, '..', 'src', 'lib', 'mdri', 'data')
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true })

  fs.writeFileSync(path.join(outDir, 'repertory.json'), JSON.stringify(rubrics))
  fs.writeFileSync(path.join(outDir, 'constellations.json'), JSON.stringify(cons || []))
  fs.writeFileSync(path.join(outDir, 'polarities.json'), JSON.stringify(pols || []))
  fs.writeFileSync(path.join(outDir, 'clinical.json'), JSON.stringify(clinical || []))

  console.log(`[prebuild] Done: ${rubrics.length} rubrics, ${cons.length} cons, ${(pols||[]).length} pols, ${(clinical||[]).length} clinical`)
}

main().catch(e => { console.error(e.message); process.exit(0) })
