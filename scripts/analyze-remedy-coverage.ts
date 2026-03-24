/**
 * Анализ покрытия рубрик по препаратам.
 * Цель: понять почему Ars доминирует.
 */
import { config } from 'dotenv'
config({ path: '.env.local' })

import { loadMDRIData } from '../src/lib/mdri/data-loader'

async function main() {
  const data = await loadMDRIData()

  // Считаем в скольких рубриках каждый препарат
  const remedyCoverage: Record<string, number> = {}
  // Считаем grade sum
  const remedyGradeSum: Record<string, number> = {}

  for (const rubric of data.repertory) {
    for (const r of rubric.remedies) {
      const abbrev = r.abbrev.toLowerCase().replace(/\.$/, '')
      remedyCoverage[abbrev] = (remedyCoverage[abbrev] || 0) + 1
      remedyGradeSum[abbrev] = (remedyGradeSum[abbrev] || 0) + r.grade
    }
  }

  // Топ-20 по покрытию
  const sorted = Object.entries(remedyCoverage)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)

  console.log('\n═══ ТОП-20 ПРЕПАРАТОВ ПО ПОКРЫТИЮ РУБРИК ═══\n')
  console.log('Remedy      | Rubrics | Avg Grade')
  console.log('------------|---------|----------')
  for (const [r, count] of sorted) {
    const avg = (remedyGradeSum[r] / count).toFixed(1)
    console.log(`${r.padEnd(12)}| ${String(count).padStart(7)} | ${avg}`)
  }

  // Также покажем сколько рубрик содержат каждый из наших проблемных ars/sulph/lyc/phos
  console.log('\n═══ ПРОБЛЕМНЫЕ ПОЛИКРЕСТЫ ═══\n')
  for (const rem of ['ars', 'sulph', 'lyc', 'phos', 'nux-v', 'puls', 'calc', 'sep', 'nat-m', 'bell']) {
    const count = remedyCoverage[rem] || 0
    const avg = count > 0 ? ((remedyGradeSum[rem] || 0) / count).toFixed(1) : '0'
    console.log(`${rem.padEnd(12)}: ${count} рубрик, avg grade ${avg}`)
  }

  // Средняя частота симптома (в скольких препаратах он встречается)
  const rubricRemedyCounts = data.repertory.map(r => r.remedies.length)
  const avgRemediesPerRubric = rubricRemedyCounts.reduce((a, b) => a + b, 0) / rubricRemedyCounts.length
  const maxRemediesPerRubric = Math.max(...rubricRemedyCounts)

  console.log(`\nВсего рубрик: ${data.repertory.length}`)
  console.log(`Среднее кол-во препаратов на рубрику: ${avgRemediesPerRubric.toFixed(1)}`)
  console.log(`Макс. препаратов в одной рубрике: ${maxRemediesPerRubric}`)
}

main().catch(console.error)
