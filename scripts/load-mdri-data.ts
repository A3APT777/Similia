/**
 * Скрипт загрузки MDRI данных (кластеры и полярности) в Supabase.
 * Запуск: npx tsx scripts/load-mdri-data.ts
 */
import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Нужны NEXT_PUBLIC_SUPABASE_URL и SUPABASE_SERVICE_ROLE_KEY в .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey)

const MDRI_DATA_DIR = 'c:/projects/mdri/data'

async function loadConstellations() {
  console.log('Загрузка кластеров...')
  const raw = fs.readFileSync(path.join(MDRI_DATA_DIR, 'constellations_full.json'), 'utf-8')
  const data = JSON.parse(raw) as Record<string, any>
  delete data._comment

  const rows = Object.entries(data).map(([remedy, con]) => ({
    remedy,
    name: con.name || remedy,
    clusters: con.clusters || [],
    sine_qua_non: con.sine_qua_non || [],
    excluders: con.excluders || [],
  }))

  // Загружаем батчами по 100
  let loaded = 0
  for (let i = 0; i < rows.length; i += 100) {
    const batch = rows.slice(i, i + 100)
    const { error } = await supabase
      .from('mdri_constellations')
      .upsert(batch, { onConflict: 'remedy' })
    if (error) {
      console.error(`Ошибка загрузки кластеров (batch ${i}):`, error.message)
      return
    }
    loaded += batch.length
  }
  console.log(`  Загружено кластеров: ${loaded}`)
}

async function loadPolarities() {
  console.log('Загрузка полярностей...')
  const raw = fs.readFileSync(path.join(MDRI_DATA_DIR, 'polarities.json'), 'utf-8')
  const data = JSON.parse(raw)
  const remedies = data.remedies as Record<string, any>

  const rows = Object.entries(remedies).map(([remedy, polarities]) => ({
    remedy,
    polarities,
  }))

  let loaded = 0
  for (let i = 0; i < rows.length; i += 100) {
    const batch = rows.slice(i, i + 100)
    const { error } = await supabase
      .from('mdri_polarities')
      .upsert(batch, { onConflict: 'remedy' })
    if (error) {
      console.error(`Ошибка загрузки полярностей (batch ${i}):`, error.message)
      return
    }
    loaded += batch.length
  }
  console.log(`  Загружено полярностей: ${loaded}`)
}

async function main() {
  console.log('=== Загрузка MDRI данных в Supabase ===\n')
  await loadConstellations()
  await loadPolarities()
  console.log('\nГотово!')
}

main().catch(console.error)
