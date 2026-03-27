/**
 * Мерж Boericke → repertory.json для MDRI engine
 * Нормализация аббревиатур, дедупликация, проверка качества
 */
import { readFileSync, writeFileSync } from 'fs'
import { join } from 'path'

type Remedy = { abbrev: string; grade: number }
type Rubric = { fullpath: string; remedies: Remedy[] }

// Нормализация аббревиатур Boericke → Kent формат
const ABBREV_MAP: Record<string, string> = {
  // Основные несовпадения
  'nat. m.': 'Nat-m.', 'nat. c.': 'Nat-c.', 'nat. s.': 'Nat-s.', 'nat. p.': 'Nat-p.',
  'calc. c.': 'Calc.', 'calc. p.': 'Calc-p.', 'calc. f.': 'Calc-f.', 'calc. s.': 'Calc-s.',
  'kali c.': 'Kali-c.', 'kali bi.': 'Kali-bi.', 'kali m.': 'Kali-m.', 'kali s.': 'Kali-s.',
  'kali p.': 'Kali-p.', 'kali i.': 'Kali-i.', 'kali n.': 'Kali-n.',
  'mag. c.': 'Mag-c.', 'mag. m.': 'Mag-m.', 'mag. p.': 'Mag-p.', 'mag. s.': 'Mag-s.',
  'nux v.': 'Nux-v.', 'nux m.': 'Nux-m.',
  'arg. n.': 'Arg-n.', 'arg. m.': 'Arg-m.',
  'bar. c.': 'Bar-c.', 'bar. m.': 'Bar-m.',
  'aur. m.': 'Aur-m.', 'aur. s.': 'Aur-s.',
  'ant. c.': 'Ant-c.', 'ant. t.': 'Ant-t.',
  'ferr. p.': 'Ferr-p.', 'ferr. m.': 'Ferr-m.',
  'merc. c.': 'Merc-c.', 'merc. d.': 'Merc-d.', 'merc. i. r.': 'Merc-i-r.',
  'hep. s.': 'Hep.', 'hep.': 'Hep.',
  'rhus t.': 'Rhus-t.', 'rhus v.': 'Rhus-v.',
  'ph. ac.': 'Ph-ac.', 'phos. ac.': 'Ph-ac.',
  'nit. ac.': 'Nit-ac.', 'fl. ac.': 'Fl-ac.', 'mur. ac.': 'Mur-ac.',
  'sul. ac.': 'Sul-ac.', 'pic. ac.': 'Pic-ac.', 'ox. ac.': 'Ox-ac.',
  'acet. ac.': 'Acet-ac.', 'benz. ac.': 'Benz-ac.',
  'carb. v.': 'Carb-v.', 'carb. an.': 'Carb-an.',
  'con. m.': 'Con.', 'con.': 'Con.',
  'ign. am.': 'Ign.',
  'can. ind.': 'Cann-i.', 'can. sat.': 'Cann-s.',
  'crot. h.': 'Crot-h.', 'crot. casc.': 'Crot-c.',
  'lac c.': 'Lac-c.', 'lac d.': 'Lac-d.',
  'am. c.': 'Am-c.', 'am. m.': 'Am-m.',
  'cup. m.': 'Cupr.', 'cup. ars.': 'Cupr-ar.',
  'plumb.': 'Plb.', 'plumb. m.': 'Plb.',
  'sul.': 'Sulph.', 'sulph.': 'Sulph.',
  // Стандартные (уже правильные)
  'acon.': 'Acon.', 'apis.': 'Apis.', 'arn.': 'Arn.', 'ars.': 'Ars.',
  'bell.': 'Bell.', 'bry.': 'Bry.', 'cham.': 'Cham.', 'chin.': 'Chin.',
  'gels.': 'Gels.', 'graph.': 'Graph.', 'lach.': 'Lach.', 'lyc.': 'Lyc.',
  'merc.': 'Merc.', 'phos.': 'Phos.', 'puls.': 'Puls.', 'sep.': 'Sep.',
  'sil.': 'Sil.', 'staph.': 'Staph.', 'stram.': 'Stram.', 'thuj.': 'Thuj.',
}

function normalizeAbbrev(raw: string): string {
  const lower = raw.toLowerCase().trim()
  if (ABBREV_MAP[lower]) return ABBREV_MAP[lower]
  // Default: capitalize first letter + dot
  if (!lower.endsWith('.')) return raw.trim() + '.'
  return raw.charAt(0).toUpperCase() + raw.slice(1).trim()
}

// Загрузка данных
const boericke: Rubric[] = JSON.parse(readFileSync('/tmp/boericke-parsed.json', 'utf-8'))
const mdriPath = join(process.cwd(), 'src', 'lib', 'mdri', 'data', 'repertory.json')
const mdri: Rubric[] = JSON.parse(readFileSync(mdriPath, 'utf-8'))

console.log(`MDRI до: ${mdri.length} рубрик`)
console.log(`Boericke: ${boericke.length} рубрик`)

// Нормализация аббревиатур в Boericke
let normalizedCount = 0
for (const rubric of boericke) {
  for (const rem of rubric.remedies) {
    const orig = rem.abbrev
    rem.abbrev = normalizeAbbrev(orig)
    if (rem.abbrev !== orig) normalizedCount++
  }
}
console.log(`Нормализовано аббревиатур: ${normalizedCount}`)

// Проверка: сколько уникальных средств после нормализации
const boerickeRemedies = new Set<string>()
for (const r of boericke) {
  for (const rem of r.remedies) {
    boerickeRemedies.add(rem.abbrev.toLowerCase().replace(/\.$/, ''))
  }
}

const mdriRemedies = new Set<string>()
for (const r of mdri) {
  for (const rem of r.remedies) {
    mdriRemedies.add(rem.abbrev.toLowerCase().replace(/\.$/, ''))
  }
}

const newRemedies = [...boerickeRemedies].filter(r => !mdriRemedies.has(r))
console.log(`\nСредств в MDRI: ${mdriRemedies.size}`)
console.log(`Средств в Boericke: ${boerickeRemedies.size}`)
console.log(`Новых средств: ${newRemedies.length}`)
console.log(`Примеры новых: ${newRemedies.slice(0, 20).join(', ')}`)

// Фильтрация мусора: убираем рубрики без средств и с мусорными названиями
const cleanBoericke = boericke.filter(r => {
  if (r.remedies.length === 0) return false
  if (r.fullpath.length < 5) return false
  if (r.fullpath.includes('�')) return false // broken encoding
  return true
})
console.log(`\nПосле очистки: ${cleanBoericke.length} рубрик (убрано ${boericke.length - cleanBoericke.length})`)

// Мерж: добавить Boericke рубрики в MDRI
// Стратегия: добавляем все как новые (fullpath другой формат)
const merged = [...mdri, ...cleanBoericke]
console.log(`\nПосле мержа: ${merged.length} рубрик`)

// Уникальные средства после мержа
const allRemedies = new Set<string>()
for (const r of merged) {
  for (const rem of r.remedies) {
    allRemedies.add(rem.abbrev.toLowerCase().replace(/\.$/, ''))
  }
}
console.log(`Всего уникальных средств: ${allRemedies.size}`)

// Сохраняем
writeFileSync(mdriPath, JSON.stringify(merged))
console.log(`\nСохранено: ${mdriPath} (${(JSON.stringify(merged).length / 1024 / 1024).toFixed(1)} MB)`)
