import json
import os
import secrets
from datetime import datetime, timedelta
import psycopg2

SCHEMA = "t_p70437429_guest_loyalty_app"

def get_db():
    return psycopg2.connect(os.environ["DATABASE_URL"])

def handler(event: dict, context) -> dict:
    """Проверяет OTP-код и возвращает сессионный токен"""
    cors = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
    }

    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": cors, "body": ""}

    body = json.loads(event.get("body") or "{}")
    phone = (body.get("phone") or "").strip()
    code = (body.get("code") or "").strip()

    if not phone or not code:
        return {"statusCode": 400, "headers": cors, "body": json.dumps({"error": "Укажите телефон и код"})}

    conn = get_db()
    cur = conn.cursor()

    # Проверяем OTP
    cur.execute(
        f"""SELECT id FROM {SCHEMA}.otp_codes
            WHERE phone = %s AND code = %s AND used = FALSE AND expires_at > NOW()
            ORDER BY created_at DESC LIMIT 1""",
        (phone, code)
    )
    row = cur.fetchone()
    if not row:
        cur.close()
        conn.close()
        return {"statusCode": 401, "headers": cors, "body": json.dumps({"error": "Неверный или устаревший код"})}

    otp_id = row[0]
    # Помечаем код использованным
    cur.execute(f"UPDATE {SCHEMA}.otp_codes SET used = TRUE WHERE id = %s", (otp_id,))

    # Получаем или создаём гостя
    cur.execute(f"SELECT id, name FROM {SCHEMA}.guests WHERE phone = %s", (phone,))
    guest = cur.fetchone()
    if guest:
        guest_id, guest_name = guest
    else:
        cur.execute(
            f"INSERT INTO {SCHEMA}.guests (phone) VALUES (%s) RETURNING id, name",
            (phone,)
        )
        guest_id, guest_name = cur.fetchone()

    # Создаём сессию
    token = secrets.token_hex(32)
    expires_at = datetime.now() + timedelta(days=30)
    cur.execute(
        f"INSERT INTO {SCHEMA}.sessions (guest_id, token, expires_at) VALUES (%s, %s, %s)",
        (guest_id, token, expires_at)
    )

    conn.commit()
    cur.close()
    conn.close()

    return {
        "statusCode": 200,
        "headers": cors,
        "body": json.dumps({
            "ok": True,
            "token": token,
            "guest_id": guest_id,
            "is_new": guest_name is None,
        })
    }
