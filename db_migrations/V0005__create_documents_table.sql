CREATE TABLE IF NOT EXISTS t_p70437429_guest_loyalty_app.documents (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  file_name VARCHAR(255),
  url TEXT NOT NULL,
  is_privacy_policy BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO t_p70437429_guest_loyalty_app.documents (title, url, is_privacy_policy)
SELECT 'Политика обработки персональных данных', value, TRUE
FROM t_p70437429_guest_loyalty_app.settings
WHERE key = 'privacy_policy_url' AND value IS NOT NULL AND value != ''
ON CONFLICT DO NOTHING;