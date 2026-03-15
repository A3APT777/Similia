const PROJECT_REF = 'obcbinbhurokubvbsgjx'
const ACCESS_TOKEN = 'sbp_da222f4f6ec163c9790f341d787c066ad50cd31e'

const sql = `
ALTER TABLE consultations
  ADD COLUMN IF NOT EXISTS remedy  VARCHAR(200),
  ADD COLUMN IF NOT EXISTS potency VARCHAR(50),
  ADD COLUMN IF NOT EXISTS dosage  TEXT;
`

const res = await fetch(
  `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`,
  {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${ACCESS_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: sql }),
  }
)

if (!res.ok) { console.error(await res.text()); process.exit(1) }
console.log('✓ remedy, potency, dosage добавлены в consultations')
