-- Отправка назначений пациентам по ссылке
CREATE TABLE IF NOT EXISTS prescription_shares (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  consultation_id UUID NOT NULL REFERENCES consultations(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  doctor_id UUID NOT NULL REFERENCES auth.users(id),
  token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(24), 'hex'),
  custom_note TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ DEFAULT (now() + interval '90 days')
);

ALTER TABLE prescription_shares ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Doctors manage own rx shares" ON prescription_shares FOR ALL USING (auth.uid() = doctor_id);
CREATE POLICY "Public read rx by token" ON prescription_shares FOR SELECT USING (true);
CREATE INDEX IF NOT EXISTS idx_rx_shares_token ON prescription_shares(token);
CREATE INDEX IF NOT EXISTS idx_rx_shares_consultation ON prescription_shares(consultation_id);

-- Правила приёма в настройках врача
ALTER TABLE doctor_settings ADD COLUMN IF NOT EXISTS prescription_rules TEXT;
