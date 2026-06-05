import json
import os
import secrets
import psycopg2
from datetime import datetime, timedelta

SCHEMA = "t_p70437429_guest_loyalty_app"


def get_conn():
    return psycopg2.connect(os.environ["DATABASE_URL"])


def level_for_spent(total_spent: float) -> str:
    if total_spent >= 100000:
        return "Платиновый"
    elif total_spent >= 50000:
        return "Золотой"
    elif total_spent >= 15000:
        return "Серебряный"
    return "Гость"


def handler(event: dict, context) -> dict:
    """Авторизация гостя по номеру телефона. Вход или регистрация."""
    cors = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, X-Session-Token",
    }

    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": cors, "body": ""}

    method = event.get("httpMethod", "GET")
    path = event.get("path", "/")

    # POST /login — вход по телефону
    if method == "POST" and path.endswith("/login"):
        body = json.loads(event.get("body") or "{}")
        phone = (body.get("phone") or "").strip()
        if not phone:
            return {"statusCode": 400, "headers": cors, "body": json.dumps({"error": "Укажите номер телефона"})}

        conn = get_conn()
        cur = conn.cursor()

        cur.execute(f"SELECT id, phone, name, birth_date, email, notifications, bonuses, total_spent, visits, level, created_at FROM {SCHEMA}.guests WHERE phone = %s", (phone,))
        row = cur.fetchone()

        if not row:
            # Новый гость — регистрируем
            cur.execute(
                f"INSERT INTO {SCHEMA}.guests (phone, level, bonuses, total_spent, visits, notifications) VALUES (%s, 'Гость', 0, 0, 0, true) RETURNING id, phone, name, birth_date, email, notifications, bonuses, total_spent, visits, level, created_at",
                (phone,)
            )
            row = cur.fetchone()

        guest_id = row[0]

        # Обновляем last_seen
        cur.execute(f"UPDATE {SCHEMA}.guests SET last_seen = NOW() WHERE id = %s", (guest_id,))

        # Создаём сессию
        token = secrets.token_hex(32)
        expires = datetime.now() + timedelta(days=30)
        cur.execute(
            f"INSERT INTO {SCHEMA}.sessions (guest_id, token, expires_at) VALUES (%s, %s, %s)",
            (guest_id, token, expires)
        )
        conn.commit()
        cur.close()
        conn.close()

        guest = {
            "id": row[0],
            "phone": row[1],
            "name": row[2],
            "birth_date": row[3].isoformat() if row[3] else None,
            "email": row[4],
            "notifications": row[5] if row[5] is not None else True,
            "bonuses": row[6] or 0,
            "total_spent": float(row[7] or 0),
            "visits": row[8] or 0,
            "level": row[9] or "Гость",
            "member_since": row[10].strftime("%B %Y") if row[10] else "",
        }

        return {
            "statusCode": 200,
            "headers": cors,
            "body": json.dumps({"token": token, "guest": guest}, ensure_ascii=False),
        }

    # GET /me — получить профиль по токену
    if method == "GET" and path.endswith("/me"):
        token = event.get("headers", {}).get("X-Session-Token", "")
        if not token:
            return {"statusCode": 401, "headers": cors, "body": json.dumps({"error": "Не авторизован"})}

        conn = get_conn()
        cur = conn.cursor()
        cur.execute(
            f"""SELECT g.id, g.phone, g.name, g.birth_date, g.email, g.notifications,
                       g.bonuses, g.total_spent, g.visits, g.level, g.created_at
                FROM {SCHEMA}.sessions s
                JOIN {SCHEMA}.guests g ON g.id = s.guest_id
                WHERE s.token = %s AND s.expires_at > NOW()""",
            (token,)
        )
        row = cur.fetchone()
        cur.close()
        conn.close()

        if not row:
            return {"statusCode": 401, "headers": cors, "body": json.dumps({"error": "Сессия истекла"})}

        guest = {
            "id": row[0],
            "phone": row[1],
            "name": row[2],
            "birth_date": row[3].isoformat() if row[3] else None,
            "email": row[4],
            "notifications": row[5] if row[5] is not None else True,
            "bonuses": row[6] or 0,
            "total_spent": float(row[7] or 0),
            "visits": row[8] or 0,
            "level": row[9] or "Гость",
            "member_since": row[10].strftime("%B %Y") if row[10] else "",
        }
        return {"statusCode": 200, "headers": cors, "body": json.dumps({"guest": guest}, ensure_ascii=False)}

    # PUT /profile — обновить профиль
    if method == "PUT" and path.endswith("/profile"):
        token = event.get("headers", {}).get("X-Session-Token", "")
        if not token:
            return {"statusCode": 401, "headers": cors, "body": json.dumps({"error": "Не авторизован"})}

        body = json.loads(event.get("body") or "{}")
        conn = get_conn()
        cur = conn.cursor()

        cur.execute(
            f"SELECT g.id FROM {SCHEMA}.sessions s JOIN {SCHEMA}.guests g ON g.id = s.guest_id WHERE s.token = %s AND s.expires_at > NOW()",
            (token,)
        )
        row = cur.fetchone()
        if not row:
            cur.close()
            conn.close()
            return {"statusCode": 401, "headers": cors, "body": json.dumps({"error": "Сессия истекла"})}

        guest_id = row[0]
        name = body.get("name")
        birth_date = body.get("birth_date")
        email = body.get("email")
        notifications = body.get("notifications")

        cur.execute(
            f"""UPDATE {SCHEMA}.guests SET
                name = COALESCE(%s, name),
                birth_date = COALESCE(%s::date, birth_date),
                email = COALESCE(%s, email),
                notifications = COALESCE(%s, notifications),
                updated_at = NOW()
                WHERE id = %s
                RETURNING id, phone, name, birth_date, email, notifications, bonuses, total_spent, visits, level, created_at""",
            (name, birth_date, email, notifications, guest_id)
        )
        row = cur.fetchone()
        conn.commit()
        cur.close()
        conn.close()

        guest = {
            "id": row[0],
            "phone": row[1],
            "name": row[2],
            "birth_date": row[3].isoformat() if row[3] else None,
            "email": row[4],
            "notifications": row[5] if row[5] is not None else True,
            "bonuses": row[6] or 0,
            "total_spent": float(row[7] or 0),
            "visits": row[8] or 0,
            "level": row[9] or "Гость",
            "member_since": row[10].strftime("%B %Y") if row[10] else "",
        }
        return {"statusCode": 200, "headers": cors, "body": json.dumps({"guest": guest}, ensure_ascii=False)}

    # POST /logout
    if method == "POST" and path.endswith("/logout"):
        token = event.get("headers", {}).get("X-Session-Token", "")
        if token:
            conn = get_conn()
            cur = conn.cursor()
            cur.execute(f"UPDATE {SCHEMA}.sessions SET expires_at = NOW() WHERE token = %s", (token,))
            conn.commit()
            cur.close()
            conn.close()
        return {"statusCode": 200, "headers": cors, "body": json.dumps({"ok": True})}

    return {"statusCode": 404, "headers": cors, "body": json.dumps({"error": "Not found"})}
