-- Автоматически создаёт подписку Стандарт до 31.05.2026 при регистрации
CREATE OR REPLACE FUNCTION handle_new_user_subscription()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.subscriptions (doctor_id, plan_id, status, billing_period, current_period_start, current_period_end)
  VALUES (NEW.id, 'standard', 'active', 'monthly', now(), '2026-05-31T23:59:59Z')
  ON CONFLICT (doctor_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created_subscription ON auth.users;
CREATE TRIGGER on_auth_user_created_subscription
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user_subscription();
