-- Структурированные поля для консультаций (вместо одного notes)
ALTER TABLE consultations ADD COLUMN IF NOT EXISTS complaints text DEFAULT '';
ALTER TABLE consultations ADD COLUMN IF NOT EXISTS observations text DEFAULT '';
ALTER TABLE consultations ADD COLUMN IF NOT EXISTS recommendations text DEFAULT '';
ALTER TABLE consultations ADD COLUMN IF NOT EXISTS repertory_data jsonb DEFAULT '[]'::jsonb;
