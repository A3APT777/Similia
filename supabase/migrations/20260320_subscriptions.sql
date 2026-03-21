-- Тарифные планы
CREATE TABLE IF NOT EXISTS subscription_plans (
  id TEXT PRIMARY KEY,
  name_ru TEXT NOT NULL,
  name_en TEXT NOT NULL,
  price_monthly INTEGER NOT NULL,       -- копейки (119000 = 1190 руб)
  price_yearly INTEGER NOT NULL,        -- копейки (1190000 = 11900 руб)
  max_patients INTEGER,                 -- NULL = безлимит
  features JSONB NOT NULL DEFAULT '{}',
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Подписки врачей
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  doctor_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id TEXT NOT NULL REFERENCES subscription_plans(id),
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active','past_due','cancelled','trialing','expired')),
  billing_period TEXT NOT NULL DEFAULT 'monthly'
    CHECK (billing_period IN ('monthly','yearly')),
  current_period_start TIMESTAMPTZ NOT NULL DEFAULT now(),
  current_period_end TIMESTAMPTZ NOT NULL,
  trial_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN NOT NULL DEFAULT false,
  yukassa_payment_method_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Doctors see own subscription" ON subscriptions
  FOR SELECT USING (auth.uid() = doctor_id);

-- Платежи за подписку
CREATE TABLE IF NOT EXISTS subscription_payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  subscription_id UUID NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
  doctor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'RUB',
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','succeeded','failed','refunded')),
  yukassa_payment_id TEXT UNIQUE,
  receipt_url TEXT,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE subscription_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Doctors see own sub payments" ON subscription_payments
  FOR SELECT USING (auth.uid() = doctor_id);

-- Seed тарифов
INSERT INTO subscription_plans (id, name_ru, name_en, price_monthly, price_yearly, max_patients, features, sort_order)
VALUES
  ('free', 'Бесплатный', 'Free', 0, 0, 5,
   '{"online_booking":false,"export":false,"followup_reminders":false}', 0),
  ('standard', 'Стандарт', 'Standard', 29000, 290000, null,
   '{"online_booking":true,"export":true,"followup_reminders":true}', 1)
ON CONFLICT (id) DO NOTHING;
