-- Таблица администраторов
CREATE TABLE IF NOT EXISTS admin_users (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- Админ может видеть только свою запись
CREATE POLICY "Admins read own" ON admin_users
  FOR SELECT USING (auth.uid() = user_id);
