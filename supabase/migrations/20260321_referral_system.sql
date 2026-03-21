-- Реферальная система

CREATE TABLE IF NOT EXISTS referral_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  code TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS referral_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID NOT NULL REFERENCES auth.users(id),
  invitee_id UUID NOT NULL UNIQUE REFERENCES auth.users(id),
  referrer_bonus_days INT DEFAULT 0,
  invitee_bonus_days INT DEFAULT 0,
  bonus_applied BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS referral_bonus_days INT DEFAULT 0;

ALTER TABLE referral_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_invitations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Doctors manage own code" ON referral_codes FOR ALL USING (auth.uid() = doctor_id);
CREATE POLICY "Doctors see own invitations" ON referral_invitations FOR SELECT USING (auth.uid() = referrer_id);

CREATE INDEX IF NOT EXISTS idx_referral_codes_code ON referral_codes(code);
CREATE INDEX IF NOT EXISTS idx_referral_invitations_referrer ON referral_invitations(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referral_invitations_invitee ON referral_invitations(invitee_id);

-- Начисление бонусов (v2: UPSERT для реферера, self-referral check, advisory lock)
CREATE OR REPLACE FUNCTION apply_referral_bonus(p_invitee_id UUID) RETURNS void AS $$
DECLARE
  v_ref_code TEXT;
  v_referrer_id UUID;
  v_referrer_bonus INT;
  v_total INT;
BEGIN
  SELECT raw_user_meta_data->>'ref_code' INTO v_ref_code FROM auth.users WHERE id = p_invitee_id;
  IF v_ref_code IS NULL THEN RETURN; END IF;

  SELECT doctor_id INTO v_referrer_id FROM referral_codes WHERE code = v_ref_code;
  IF v_referrer_id IS NULL THEN RETURN; END IF;

  -- Защита от self-referral
  IF p_invitee_id = v_referrer_id THEN RETURN; END IF;

  -- Advisory lock для защиты от параллельных webhook-ов
  PERFORM pg_advisory_xact_lock(hashtext(p_invitee_id::text));

  IF EXISTS (SELECT 1 FROM referral_invitations WHERE invitee_id = p_invitee_id AND bonus_applied) THEN RETURN; END IF;

  -- +7 дней рефереру (макс 180, UPSERT)
  SELECT COALESCE(referral_bonus_days, 0) INTO v_total FROM subscriptions WHERE doctor_id = v_referrer_id;
  v_referrer_bonus := LEAST(7, 180 - COALESCE(v_total, 0));
  IF v_referrer_bonus > 0 THEN
    INSERT INTO subscriptions (doctor_id, plan_id, status, current_period_start, current_period_end, referral_bonus_days)
    VALUES (v_referrer_id, 'standard', 'active', now(), now() + (v_referrer_bonus || ' days')::interval, v_referrer_bonus)
    ON CONFLICT (doctor_id) DO UPDATE SET
      current_period_end = GREATEST(COALESCE(subscriptions.current_period_end, now()), now()) + (v_referrer_bonus || ' days')::interval,
      referral_bonus_days = COALESCE(subscriptions.referral_bonus_days, 0) + v_referrer_bonus,
      status = 'active', plan_id = 'standard';
  END IF;

  -- +14 дней приглашённому (UPSERT)
  INSERT INTO subscriptions (doctor_id, plan_id, status, current_period_start, current_period_end, referral_bonus_days)
  VALUES (p_invitee_id, 'standard', 'active', now(), now() + interval '14 days', 14)
  ON CONFLICT (doctor_id) DO UPDATE SET
    current_period_end = GREATEST(COALESCE(subscriptions.current_period_end, now()), now()) + interval '14 days',
    referral_bonus_days = COALESCE(subscriptions.referral_bonus_days, 0) + 14,
    status = 'active', plan_id = 'standard';

  INSERT INTO referral_invitations (referrer_id, invitee_id, referrer_bonus_days, invitee_bonus_days, bonus_applied)
  VALUES (v_referrer_id, p_invitee_id, v_referrer_bonus, 14, true)
  ON CONFLICT (invitee_id) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
