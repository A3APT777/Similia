-- Атомарное каскадное удаление пациента
-- Запустить в Supabase Dashboard → SQL Editor

CREATE OR REPLACE FUNCTION delete_patient_cascade(p_patient_id UUID, p_doctor_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Проверяем, что пациент принадлежит врачу
  IF NOT EXISTS (
    SELECT 1 FROM patients WHERE id = p_patient_id AND doctor_id = p_doctor_id
  ) THEN
    RAISE EXCEPTION 'Patient not found or access denied';
  END IF;

  -- Удаляем follow-up через консультации
  DELETE FROM followups
  WHERE consultation_id IN (
    SELECT id FROM consultations WHERE patient_id = p_patient_id AND doctor_id = p_doctor_id
  );

  -- Удаляем консультации
  DELETE FROM consultations WHERE patient_id = p_patient_id AND doctor_id = p_doctor_id;

  -- Удаляем связанные данные
  DELETE FROM payment_history WHERE patient_id = p_patient_id AND doctor_id = p_doctor_id;
  DELETE FROM patient_photos WHERE patient_id = p_patient_id AND doctor_id = p_doctor_id;
  DELETE FROM photo_upload_tokens WHERE patient_id = p_patient_id AND doctor_id = p_doctor_id;
  DELETE FROM intake_forms WHERE patient_id = p_patient_id;

  -- Удаляем самого пациента
  DELETE FROM patients WHERE id = p_patient_id AND doctor_id = p_doctor_id;
END;
$$;
