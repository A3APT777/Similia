-- Добавить raw_engine_top3 — top-3 до верификатора Sonnet.
-- Текущий engine_top3 после Шага 3.5 (verifyTop5) может быть переранжирован,
-- из-за чего score в логе не соответствует порядку. Храним оба.

ALTER TABLE ai_analysis_log
ADD COLUMN IF NOT EXISTS raw_engine_top3 JSONB;
