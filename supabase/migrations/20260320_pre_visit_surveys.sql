-- Предконсультационные опросники (заполняет пациент перед повторным визитом)
CREATE TABLE IF NOT EXISTS pre_visit_surveys (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  consultation_id UUID REFERENCES consultations(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  doctor_id UUID NOT NULL REFERENCES auth.users(id),
  token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(24), 'hex'),
  answers JSONB,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed')),
  created_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ DEFAULT (now() + interval '30 days')
);

ALTER TABLE pre_visit_surveys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Doctors manage own surveys" ON pre_visit_surveys
  FOR ALL USING (auth.uid() = doctor_id);

CREATE INDEX IF NOT EXISTS idx_pre_visit_surveys_token ON pre_visit_surveys(token);
CREATE INDEX IF NOT EXISTS idx_pre_visit_surveys_consultation ON pre_visit_surveys(consultation_id);
CREATE INDEX IF NOT EXISTS idx_pre_visit_surveys_patient ON pre_visit_surveys(patient_id);

-- Добавить каскадное удаление в функцию delete_patient_cascade
CREATE OR REPLACE FUNCTION delete_patient_cascade(p_patient_id UUID, p_doctor_id UUID)
RETURNS void AS $$
BEGIN
  DELETE FROM pre_visit_surveys WHERE patient_id = p_patient_id AND doctor_id = p_doctor_id;
  DELETE FROM followups WHERE consultation_id IN (SELECT id FROM consultations WHERE patient_id = p_patient_id AND doctor_id = p_doctor_id);
  DELETE FROM consultations WHERE patient_id = p_patient_id AND doctor_id = p_doctor_id;
  DELETE FROM intake_forms WHERE patient_id = p_patient_id AND doctor_id = p_doctor_id;
  DELETE FROM patient_photos WHERE patient_id = p_patient_id AND doctor_id = p_doctor_id;
  DELETE FROM patients WHERE id = p_patient_id AND doctor_id = p_doctor_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
