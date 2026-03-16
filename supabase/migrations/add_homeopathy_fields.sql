-- Миграция: добавление гомеопатических полей
-- Запустить в Supabase Dashboard → SQL Editor

-- 1. Конституциональный тип пациента
ALTER TABLE patients
  ADD COLUMN IF NOT EXISTS constitutional_type TEXT;

-- 2. Рубрики реперториума (через запятую или JSON-массив)
ALTER TABLE consultations
  ADD COLUMN IF NOT EXISTS rubrics TEXT;

-- 3. Реакция на предыдущий препарат
ALTER TABLE consultations
  ADD COLUMN IF NOT EXISTS reaction_to_previous TEXT;
