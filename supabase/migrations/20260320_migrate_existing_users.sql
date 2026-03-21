-- Миграция существующих пользователей: Стандарт бесплатно на 6 месяцев (early adopter bonus)
INSERT INTO subscriptions (doctor_id, plan_id, status, billing_period, current_period_start, current_period_end, trial_end)
SELECT id, 'standard', 'trialing', 'monthly', now(), now() + interval '180 days', now() + interval '180 days'
FROM auth.users
WHERE id NOT IN (SELECT doctor_id FROM subscriptions);
