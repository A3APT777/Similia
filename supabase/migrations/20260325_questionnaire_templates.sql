-- Кастомные шаблоны анкет для врачей
CREATE TABLE IF NOT EXISTS questionnaire_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  doctor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('primary', 'acute', 'pre_visit')),
  fields JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(doctor_id, type)
);

ALTER TABLE questionnaire_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Doctors manage own templates" ON questionnaire_templates
  FOR ALL USING (doctor_id = auth.uid());
