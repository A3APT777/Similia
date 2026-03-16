import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://obcbinbhurokubvbsgjx.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9iY2JpbmJodXJva3VidmJzZ2p4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzU5MTM4OSwiZXhwIjoyMDg5MTY3Mzg5fQ.e7g4Dlm8npJkTNbE3Ak79WFEHHImVGKJhsTUpOAfF5g'
)

const { data } = await supabase
  .from('homeo_remedies')
  .select('abbrev, name_latin')
  .order('name_latin')
  .limit(30)

data.forEach(r => console.log(`"${r.abbrev}" | ${r.name_latin}`))
