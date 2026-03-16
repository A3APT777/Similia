-- Миграция: учёт оплаченных консультаций
-- Запустить в Supabase Dashboard → SQL Editor

-- 1. Настройки врача
CREATE TABLE IF NOT EXISTS doctor_settings (
  doctor_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  paid_sessions_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE doctor_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Doctors manage own settings" ON doctor_settings
  FOR ALL USING (auth.uid() = doctor_id);

-- 2. Счётчик оплаченных консультаций в карточке пациента
ALTER TABLE patients
  ADD COLUMN IF NOT EXISTS paid_sessions INTEGER NOT NULL DEFAULT 0;

-- 3. История платежей
CREATE TABLE IF NOT EXISTS payment_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
  doctor_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE payment_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Doctors manage own payment history" ON payment_history
  FOR ALL USING (auth.uid() = doctor_id);
