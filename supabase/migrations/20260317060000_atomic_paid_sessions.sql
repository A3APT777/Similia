-- Атомарное добавление оплаченных сеансов (защита от race condition)
CREATE OR REPLACE FUNCTION increment_paid_sessions(p_patient_id uuid, p_doctor_id uuid, p_amount int)
RETURNS int AS $$
  UPDATE patients
  SET paid_sessions = COALESCE(paid_sessions, 0) + p_amount
  WHERE id = p_patient_id AND doctor_id = p_doctor_id
  RETURNING paid_sessions;
$$ LANGUAGE sql;

-- Атомарное уменьшение оплаченных сеансов
CREATE OR REPLACE FUNCTION decrement_paid_session(p_patient_id uuid, p_doctor_id uuid)
RETURNS TABLE(prev_count int, new_count int) AS $$
  WITH old AS (
    SELECT COALESCE(paid_sessions, 0) AS cnt
    FROM patients
    WHERE id = p_patient_id AND doctor_id = p_doctor_id
  ),
  upd AS (
    UPDATE patients
    SET paid_sessions = GREATEST(COALESCE(paid_sessions, 0) - 1, 0)
    WHERE id = p_patient_id AND doctor_id = p_doctor_id
    AND COALESCE(paid_sessions, 0) > 0
    RETURNING paid_sessions
  )
  SELECT
    (SELECT cnt FROM old) AS prev_count,
    COALESCE((SELECT paid_sessions FROM upd), (SELECT cnt FROM old)) AS new_count;
$$ LANGUAGE sql;
