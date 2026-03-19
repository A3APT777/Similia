-- Индексы на часто используемые foreign keys
-- Ускоряют все запросы с фильтрацией по doctor_id и token

-- IF NOT EXISTS — безопасно, если индекс уже существует, пропустит

CREATE INDEX IF NOT EXISTS idx_patients_doctor_id ON patients(doctor_id);
CREATE INDEX IF NOT EXISTS idx_consultations_doctor_id ON consultations(doctor_id);
CREATE INDEX IF NOT EXISTS idx_consultations_patient_id ON consultations(patient_id);
CREATE INDEX IF NOT EXISTS idx_consultations_scheduled_at ON consultations(scheduled_at) WHERE scheduled_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_intake_forms_token ON intake_forms(token);
CREATE INDEX IF NOT EXISTS idx_intake_forms_doctor_id ON intake_forms(doctor_id);
CREATE INDEX IF NOT EXISTS idx_followups_token ON followups(token);
CREATE INDEX IF NOT EXISTS idx_followups_consultation_id ON followups(consultation_id);
CREATE INDEX IF NOT EXISTS idx_patient_photos_patient_id ON patient_photos(patient_id);
CREATE INDEX IF NOT EXISTS idx_photo_upload_tokens_token ON photo_upload_tokens(token);
CREATE INDEX IF NOT EXISTS idx_new_patient_tokens_token ON new_patient_tokens(token);
