INSERT INTO t_p70437429_guest_loyalty_app.settings (key, value)
VALUES ('contact_website', 'https://freedomvilage.ru/#homes')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
