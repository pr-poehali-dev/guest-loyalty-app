CREATE TABLE IF NOT EXISTS t_p70437429_guest_loyalty_app.settings (
  key   VARCHAR(100) PRIMARY KEY,
  value TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO t_p70437429_guest_loyalty_app.settings (key, value) VALUES
  ('contact_phone',    '+7 (900) 000-00-00'),
  ('contact_whatsapp', '+7 (900) 000-00-00'),
  ('contact_email',    'info@freedom-village.ru'),
  ('contact_address',  'Московская область, пос. Лесной'),
  ('contact_hours',    'Ежедневно, 9:00 — 21:00')
ON CONFLICT (key) DO NOTHING;
