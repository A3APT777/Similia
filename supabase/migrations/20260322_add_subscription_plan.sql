-- Добавляем колонку subscription_plan для AI Pro
ALTER TABLE doctor_settings ADD COLUMN IF NOT EXISTS subscription_plan TEXT DEFAULT NULL;
