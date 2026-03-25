-- Защита от двойной записи на одно время
CREATE UNIQUE INDEX IF NOT EXISTS idx_no_double_booking
ON consultations (doctor_id, scheduled_at)
WHERE status != 'cancelled' AND scheduled_at IS NOT NULL;
