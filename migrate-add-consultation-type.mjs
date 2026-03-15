// Миграция: добавляет поле type в таблицу consultations
// Запустить: node migrate-add-consultation-type.mjs

const PROJECT_REF = 'obcbinbhurokubvbsgjx'
const ACCESS_TOKEN = 'sbp_da222f4f6ec163c9790f341d787c066ad50cd31e'

const sql = `
ALTER TABLE consultations
  ADD COLUMN IF NOT EXISTS type VARCHAR(20) NOT NULL DEFAULT 'chronic';

-- Индекс для фильтрации по типу
CREATE INDEX IF NOT EXISTS consultations_type_idx ON consultations(type);
`

const response = await fetch(
  `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`,
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: sql }),
  }
)

if (!response.ok) {
  const text = await response.text()
  console.error('Ошибка:', response.status, text)
  process.exit(1)
}

console.log('✓ Колонка type добавлена в таблицу consultations')
console.log('  chronic = хронический случай (по умолчанию)')
console.log('  acute   = острый случай')
