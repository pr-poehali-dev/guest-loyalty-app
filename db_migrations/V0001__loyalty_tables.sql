CREATE TABLE IF NOT EXISTS t_p70437429_guest_loyalty_app.guests (
    id SERIAL PRIMARY KEY,
    phone VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(100),
    email VARCHAR(100),
    birth_date DATE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS t_p70437429_guest_loyalty_app.otp_codes (
    id SERIAL PRIMARY KEY,
    phone VARCHAR(20) NOT NULL,
    code VARCHAR(6) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS t_p70437429_guest_loyalty_app.sessions (
    id SERIAL PRIMARY KEY,
    guest_id INTEGER REFERENCES t_p70437429_guest_loyalty_app.guests(id),
    token VARCHAR(64) UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS t_p70437429_guest_loyalty_app.bonus_transactions (
    id SERIAL PRIMARY KEY,
    guest_id INTEGER REFERENCES t_p70437429_guest_loyalty_app.guests(id),
    amount INTEGER NOT NULL,
    type VARCHAR(10) NOT NULL CHECK (type IN ('earn', 'spend')),
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_otp_phone ON t_p70437429_guest_loyalty_app.otp_codes(phone);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON t_p70437429_guest_loyalty_app.sessions(token);
CREATE INDEX IF NOT EXISTS idx_bonus_guest ON t_p70437429_guest_loyalty_app.bonus_transactions(guest_id);
