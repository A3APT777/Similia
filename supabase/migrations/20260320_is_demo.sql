-- Флаг для демо-пациентов (не считаются в лимит подписки)
ALTER TABLE patients ADD COLUMN IF NOT EXISTS is_demo BOOLEAN NOT NULL DEFAULT false;
UPDATE patients SET is_demo = true WHERE notes LIKE '%Демо-пациент%';
