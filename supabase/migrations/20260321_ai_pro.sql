-- AI Pro: MDRI интеграция
-- Тариф AI Pro, таблицы кластеров/полярностей, AI-анкеты, AI-кредиты

-- 1. Тариф AI Pro
INSERT INTO subscription_plans (id, name_ru, name_en, price_monthly, price_yearly, max_patients, features, sort_order)
VALUES ('ai_pro', 'AI Pro', 'AI Pro', 199000, 1990000, NULL,
  '{"online_booking": true, "export": true, "followup_reminders": true, "ai_consultation": true}'::jsonb,
  3)
ON CONFLICT (id) DO UPDATE SET
  price_monthly = EXCLUDED.price_monthly,
  price_yearly = EXCLUDED.price_yearly,
  features = EXCLUDED.features,
  sort_order = EXCLUDED.sort_order;

-- 2. Поле source в consultations (manual / ai)
ALTER TABLE consultations ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual';

-- 3. AI-результат в consultations
ALTER TABLE consultations ADD COLUMN IF NOT EXISTS ai_result JSONB;

-- 4. AI-кредиты в doctor_settings (для пакетов и рефералов)
ALTER TABLE doctor_settings ADD COLUMN IF NOT EXISTS ai_credits INTEGER DEFAULT 0;

-- 5. Таблица AI-анкет
CREATE TABLE IF NOT EXISTS ai_intake_forms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  doctor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token TEXT UNIQUE NOT NULL,
  questions_json JSONB NOT NULL,
  answers_json JSONB,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'expired')),
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_ai_intake_token ON ai_intake_forms(token);
ALTER TABLE ai_intake_forms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Doctors manage own AI intakes" ON ai_intake_forms
  FOR ALL USING (auth.uid() = doctor_id);

-- 6. Таблица кластеров (constellations)
CREATE TABLE IF NOT EXISTS mdri_constellations (
  remedy TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  clusters JSONB NOT NULL,
  sine_qua_non TEXT[] DEFAULT '{}',
  excluders TEXT[] DEFAULT '{}'
);

-- 7. Таблица полярностей
CREATE TABLE IF NOT EXISTS mdri_polarities (
  remedy TEXT PRIMARY KEY,
  polarities JSONB NOT NULL
);

-- 8. Обновить реферальную таблицу — AI-кредиты за рефералов
ALTER TABLE referral_invitations ADD COLUMN IF NOT EXISTS referrer_bonus_ai_credits INTEGER DEFAULT 0;
