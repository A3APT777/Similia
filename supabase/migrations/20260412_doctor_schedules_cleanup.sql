-- Чистка doctor_schedules: убираем per-day колонки, оставляем single-row структуру.
-- Причина: server action пишет single-row (session_duration, working_days, lunch_*),
-- а таблица держала старые NOT NULL колонки (day_of_week, is_active) без default —
-- из-за чего INSERT падал и сохранение расписания не работало.
--
-- Таблица на момент миграции пустая (0 строк) — данные не теряем.

ALTER TABLE doctor_schedules DROP COLUMN IF EXISTS day_of_week;
ALTER TABLE doctor_schedules DROP COLUMN IF EXISTS is_active;
