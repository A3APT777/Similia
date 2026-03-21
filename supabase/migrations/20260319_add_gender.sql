-- Добавляем поле пола пациента
ALTER TABLE patients ADD COLUMN IF NOT EXISTS gender TEXT;
