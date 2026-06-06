import json
import os
import secrets
import psycopg2
from datetime import datetime, timedelta, date

SCHEMA = "t_p70437429_guest_loyalty_app"

BONUS_REGISTRATION = 1000
BONUS_BIRTHDAY     = 3000


def get_conn():
    return psycopg2.connect(os.environ["DATABASE_URL"])


def handler(event: dict, context) -> dict:
    """Авторизация и управление профилем гостя по номеру телефона.
    При первой регистрации начисляется 1000 бонусов.
    При входе в день рождения начисляется 3000 бонусов (раз в год).
    """
    cors = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, X-Session-Token",
    }

    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": cors, "body": ""}

    method = event.get("httpMethod", "POST")
    body = json.loads(event.get("body") or "{}")
    action = body.get("action", "")
    token = (event.get("headers") or {}).get("X-Session-Token", "")

    # ── LOGIN / REGISTER ────────────────────────────────────────────
    if method == "POST" and action == "login":
        phone = (body.get("phone") or "").strip()
        if not phone:
            return {"statusCode": 400, "headers": cors, "body": json.dumps({"error": "Укажите номер телефона"})}

        conn = get_conn()
        cur = conn.cursor()

        cur.execute(
            f"SELECT id, phone, name, birth_date, email, notifications, bonuses, total_spent, visits, level, created_at FROM {SCHEMA}.guests WHERE phone = %s",
            (phone,)
        )
        row = cur.fetchone()
        is_new = row is None

        if is_new:
            cur.execute(
                f"INSERT INTO {SCHEMA}.guests (phone, level, bonuses, total_spent, visits, notifications) VALUES (%s, 'Без уровня', 0, 0, 0, true) RETURNING id, phone, name, birth_date, email, notifications, bonuses, total_spent, visits, level, created_at",
                (phone,)
            )
            row = cur.fetchone()

        guest_id = row[0]
        cur.execute(f"UPDATE {SCHEMA}.guests SET last_seen = NOW() WHERE id = %s", (guest_id,))

        new_token = secrets.token_hex(32)
        expires = datetime.now() + timedelta(days=30)
        cur.execute(
            f"INSERT INTO {SCHEMA}.sessions (guest_id, token, expires_at) VALUES (%s, %s, %s)",
            (guest_id, new_token, expires)
        )
        conn.commit()
        cur.close()
        conn.close()

        return {"statusCode": 200, "headers": cors, "body": json.dumps({"token": new_token, "guest": _row_to_guest(row), "is_new": is_new}, ensure_ascii=False)}

    # ── GET ME ──────────────────────────────────────────────────────
    if method == "GET":
        if not token:
            return {"statusCode": 401, "headers": cors, "body": json.dumps({"error": "Не авторизован"})}
        conn = get_conn()
        cur = conn.cursor()
        row = _guest_by_token(cur, token)
        cur.close()
        conn.close()
        if not row:
            return {"statusCode": 401, "headers": cors, "body": json.dumps({"error": "Сессия истекла"})}
        return {"statusCode": 200, "headers": cors, "body": json.dumps({"guest": _row_to_guest(row)}, ensure_ascii=False)}

    # ── UPDATE PROFILE ──────────────────────────────────────────────
    if method == "PUT" and action == "update_profile":
        if not token:
            return {"statusCode": 401, "headers": cors, "body": json.dumps({"error": "Не авторизован"})}
        conn = get_conn()
        cur = conn.cursor()

        cur.execute(
            f"SELECT g.id, g.name, g.bonuses FROM {SCHEMA}.sessions s JOIN {SCHEMA}.guests g ON g.id = s.guest_id WHERE s.token = %s AND s.expires_at > NOW()",
            (token,)
        )
        r = cur.fetchone()
        if not r:
            cur.close()
            conn.close()
            return {"statusCode": 401, "headers": cors, "body": json.dumps({"error": "Сессия истекла"})}

        guest_id    = r[0]
        was_unnamed = not r[1]

        new_name       = body.get("name")
        new_birth_date = body.get("birth_date")
        new_email      = body.get("email")
        new_notif      = body.get("notifications")

        cur.execute(
            f"""UPDATE {SCHEMA}.guests SET
                name          = COALESCE(%s, name),
                birth_date    = COALESCE(%s::date, birth_date),
                email         = COALESCE(%s, email),
                notifications = COALESCE(%s, notifications),
                updated_at    = NOW()
                WHERE id = %s
                RETURNING id, phone, name, birth_date, email, notifications, bonuses, total_spent, visits, level, created_at""",
            (new_name, new_birth_date, new_email, new_notif, guest_id)
        )
        row = cur.fetchone()

        # Начисляем 1000 бонусов за регистрацию (первое заполнение имени)
        if was_unnamed and new_name:
            cur.execute(
                f"UPDATE {SCHEMA}.guests SET bonuses = bonuses + %s WHERE id = %s",
                (BONUS_REGISTRATION, guest_id)
            )
            cur.execute(
                f"INSERT INTO {SCHEMA}.bonus_transactions (guest_id, type, amount, description) VALUES (%s, 'earn', %s, %s)",
                (guest_id, BONUS_REGISTRATION, "Приветственные бонусы за регистрацию")
            )

        conn.commit()

        # Перечитываем гостя с актуальным балансом
        cur.execute(
            f"SELECT id, phone, name, birth_date, email, notifications, bonuses, total_spent, visits, level, created_at FROM {SCHEMA}.guests WHERE id = %s",
            (guest_id,)
        )
        row = cur.fetchone()
        cur.close()
        conn.close()
        return {"statusCode": 200, "headers": cors, "body": json.dumps({"guest": _row_to_guest(row)}, ensure_ascii=False)}

    # ── BIRTHDAY BONUS ──────────────────────────────────────────────
    if method == "POST" and action == "birthday_bonus":
        if not token:
            return {"statusCode": 401, "headers": cors, "body": json.dumps({"error": "Не авторизован"})}
        conn = get_conn()
        cur = conn.cursor()

        cur.execute(
            f"""SELECT g.id, g.birth_date, g.bonuses
                FROM {SCHEMA}.sessions s JOIN {SCHEMA}.guests g ON g.id = s.guest_id
                WHERE s.token = %s AND s.expires_at > NOW()""",
            (token,)
        )
        r = cur.fetchone()
        if not r:
            cur.close()
            conn.close()
            return {"statusCode": 401, "headers": cors, "body": json.dumps({"error": "Сессия истекла"})}

        guest_id, birth_date, current_bonuses = r[0], r[1], r[2]

        if not birth_date:
            cur.close()
            conn.close()
            return {"statusCode": 400, "headers": cors, "body": json.dumps({"error": "Дата рождения не указана"})}

        today = date.today()
        is_birthday = (birth_date.month == today.month and birth_date.day == today.day)
        if not is_birthday:
            cur.close()
            conn.close()
            return {"statusCode": 400, "headers": cors, "body": json.dumps({"error": "Сегодня не день рождения"})}

        # Проверяем, не начисляли ли уже в этом году
        cur.execute(
            f"""SELECT id FROM {SCHEMA}.bonus_transactions
                WHERE guest_id = %s AND type = 'earn' AND description = 'Бонусы на день рождения'
                AND created_at >= date_trunc('year', NOW())""",
            (guest_id,)
        )
        already_given = cur.fetchone()
        if already_given:
            cur.close()
            conn.close()
            return {"statusCode": 400, "headers": cors, "body": json.dumps({"error": "Бонусы на день рождения уже начислены в этом году"})}

        cur.execute(
            f"UPDATE {SCHEMA}.guests SET bonuses = bonuses + %s WHERE id = %s",
            (BONUS_BIRTHDAY, guest_id)
        )
        cur.execute(
            f"INSERT INTO {SCHEMA}.bonus_transactions (guest_id, type, amount, description) VALUES (%s, 'earn', %s, %s)",
            (guest_id, BONUS_BIRTHDAY, "Бонусы на день рождения")
        )
        conn.commit()

        cur.execute(
            f"SELECT id, phone, name, birth_date, email, notifications, bonuses, total_spent, visits, level, created_at FROM {SCHEMA}.guests WHERE id = %s",
            (guest_id,)
        )
        row = cur.fetchone()
        cur.close()
        conn.close()
        return {"statusCode": 200, "headers": cors, "body": json.dumps({"guest": _row_to_guest(row), "bonus_given": BONUS_BIRTHDAY}, ensure_ascii=False)}

    # ── LOGOUT ──────────────────────────────────────────────────────
    if method == "POST" and action == "logout":
        if token:
            conn = get_conn()
            cur = conn.cursor()
            cur.execute(f"UPDATE {SCHEMA}.sessions SET expires_at = NOW() WHERE token = %s", (token,))
            conn.commit()
            cur.close()
            conn.close()
        return {"statusCode": 200, "headers": cors, "body": json.dumps({"ok": True})}

    return {"statusCode": 400, "headers": cors, "body": json.dumps({"error": "Неизвестный запрос"})}


def _guest_by_token(cur, token: str):
    cur.execute(
        f"""SELECT g.id, g.phone, g.name, g.birth_date, g.email, g.notifications,
                   g.bonuses, g.total_spent, g.visits, g.level, g.created_at
            FROM {SCHEMA}.sessions s
            JOIN {SCHEMA}.guests g ON g.id = s.guest_id
            WHERE s.token = %s AND s.expires_at > NOW()""",
        (token,)
    )
    return cur.fetchone()


def _row_to_guest(row) -> dict:
    MONTHS_RU = ["", "января", "февраля", "марта", "апреля", "мая", "июня",
                 "июля", "августа", "сентября", "октября", "ноября", "декабря"]
    created = row[10]
    member_since = f"{MONTHS_RU[created.month]} {created.year}" if created else ""
    return {
        "id": row[0],
        "phone": row[1],
        "name": row[2],
        "birth_date": row[3].isoformat() if row[3] else None,
        "email": row[4],
        "notifications": row[5] if row[5] is not None else True,
        "bonuses": row[6] or 0,
        "total_spent": float(row[7] or 0),
        "visits": row[8] or 0,
        "level": row[9] or "Без уровня",
        "member_since": member_since,
    }