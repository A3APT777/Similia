import pg from 'pg'
const { Client } = pg

// Пробуем прямое подключение (не pooler)
const client = new Client({
  host: 'db.obcbinbhurokubvbsgjx.supabase.co',
  port: 5432,
  database: 'postgres',
  user: 'postgres',
  password: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9iY2JpbmJodXJva3VidmJzZ2p4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzU5MTM4OSwiZXhwIjoyMDg5MTY3Mzg5fQ.e7g4Dlm8npJkTNbE3Ak79WFEHHImVGKJhsTUpOAfF5g',
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 10000,
})

try {
  await client.connect()
  console.log('Подключился к Postgres')
  const queries = [
    'ALTER TABLE patients ADD COLUMN IF NOT EXISTS constitutional_type TEXT',
    'ALTER TABLE consultations ADD COLUMN IF NOT EXISTS rubrics TEXT',
    'ALTER TABLE consultations ADD COLUMN IF NOT EXISTS reaction_to_previous TEXT',
  ]
  for (const q of queries) {
    await client.query(q)
    console.log('OK:', q)
  }
} catch (err) {
  console.error('Ошибка:', err.message)
} finally {
  await client.end().catch(() => {})
}
