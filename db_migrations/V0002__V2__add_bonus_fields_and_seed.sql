
ALTER TABLE t_p70437429_guest_loyalty_app.guests
  ADD COLUMN IF NOT EXISTS notifications BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS bonuses INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_spent NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS visits INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS level VARCHAR(30) DEFAULT 'Гость',
  ADD COLUMN IF NOT EXISTS last_seen TIMESTAMPTZ DEFAULT NOW();

INSERT INTO t_p70437429_guest_loyalty_app.guests (phone, name, birth_date, bonuses, total_spent, visits, level, notifications)
VALUES ('+79001234567', 'Анна Смирнова', '1990-03-15', 3240, 54800, 7, 'Серебряный', true)
ON CONFLICT (phone) DO NOTHING;

INSERT INTO t_p70437429_guest_loyalty_app.bonus_transactions (guest_id, type, amount, description, created_at)
SELECT g.id, 'earn', 480, 'Проживание — Дом №3 «Берёзка»', NOW() - INTERVAL '8 days'
FROM t_p70437429_guest_loyalty_app.guests g WHERE g.phone = '+79001234567';

INSERT INTO t_p70437429_guest_loyalty_app.bonus_transactions (guest_id, type, amount, description, created_at)
SELECT g.id, 'spend', -1000, 'Списание при бронировании', NOW() - INTERVAL '21 days'
FROM t_p70437429_guest_loyalty_app.guests g WHERE g.phone = '+79001234567';

INSERT INTO t_p70437429_guest_loyalty_app.bonus_transactions (guest_id, type, amount, description, created_at)
SELECT g.id, 'earn', 620, 'Проживание — Дом №1 «Сосновый»', NOW() - INTERVAL '64 days'
FROM t_p70437429_guest_loyalty_app.guests g WHERE g.phone = '+79001234567';

INSERT INTO t_p70437429_guest_loyalty_app.bonus_transactions (guest_id, type, amount, description, created_at)
SELECT g.id, 'earn', 200, 'Бонус за отзыв', NOW() - INTERVAL '86 days'
FROM t_p70437429_guest_loyalty_app.guests g WHERE g.phone = '+79001234567';
