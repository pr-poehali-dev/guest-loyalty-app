import json
import os
import psycopg2

SCHEMA = "t_p70437429_guest_loyalty_app"

def get_db():
    return psycopg2.connect(os.environ["DATABASE_URL"])

def cors_headers():
    return {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, X-Authorization",
    }

def get_guest_from_token(cur, token):
    cur.execute(
        f"""SELECT g.id, g.phone, g.name, g.email, g.created_at
            FROM {SCHEMA}.sessions s
            JOIN {SCHEMA}.guests g ON g.id = s.guest_id
            WHERE s.token = %s AND s.expires_at > NOW()""",
        (token,)
    )
    return cur.fetchone()

def handler(event: dict, context) -> dict:
    """Возвращает профиль гостя: данные, бонусный баланс, историю транзакций"""
    headers_resp = cors_headers()

    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": headers_resp, "body": ""}

    auth = (event.get("headers") or {}).get("X-Authorization", "")
    token = auth.replace("Bearer ", "").strip()
    if not token:
        return {"statusCode": 401, "headers": headers_resp, "body": json.dumps({"error": "Требуется авторизация"})}

    method = event.get("httpMethod", "GET")
    conn = get_db()
    cur = conn.cursor()

    guest = get_guest_from_token(cur, token)
    if not guest:
        cur.close()
        conn.close()
        return {"statusCode": 401, "headers": headers_resp, "body": json.dumps({"error": "Сессия недействительна"})}

    guest_id, phone, name, email, created_at = guest

    if method == "POST":
        # Обновление профиля
        body = json.loads(event.get("body") or "{}")
        new_name = body.get("name", name)
        new_email = body.get("email", email)
        cur.execute(
            f"UPDATE {SCHEMA}.guests SET name = %s, email = %s, updated_at = NOW() WHERE id = %s",
            (new_name, new_email, guest_id)
        )
        conn.commit()
        name, email = new_name, new_email

    # Бонусный баланс
    cur.execute(
        f"""SELECT COALESCE(SUM(CASE WHEN type='earn' THEN amount ELSE -amount END), 0)
            FROM {SCHEMA}.bonus_transactions WHERE guest_id = %s""",
        (guest_id,)
    )
    balance = int(cur.fetchone()[0])

    # Количество визитов (транзакции earn с описанием "Проживание")
    cur.execute(
        f"SELECT COUNT(*) FROM {SCHEMA}.bonus_transactions WHERE guest_id = %s AND type = 'earn'",
        (guest_id,)
    )
    earn_count = cur.fetchone()[0]

    # Сумма трат (для определения уровня)
    cur.execute(
        f"""SELECT COALESCE(SUM(amount), 0) FROM {SCHEMA}.bonus_transactions
            WHERE guest_id = %s AND type = 'earn'""",
        (guest_id,)
    )
    total_earned_bonus = int(cur.fetchone()[0])
    # Примерная сумма проживаний: если начисляем 5%, то потрачено = бонусы / 0.05
    total_spent_rub = total_earned_bonus * 20

    # История транзакций
    cur.execute(
        f"""SELECT id, amount, type, description, created_at
            FROM {SCHEMA}.bonus_transactions
            WHERE guest_id = %s
            ORDER BY created_at DESC LIMIT 20""",
        (guest_id,)
    )
    transactions = [
        {
            "id": row[0],
            "amount": row[1],
            "type": row[2],
            "description": row[3] or "",
            "date": row[4].strftime("%d %B %Y") if row[4] else "",
        }
        for row in cur.fetchall()
    ]

    # Определяем уровень
    if total_spent_rub >= 100000:
        level, level_next, level_percent = "Платиновый", None, 10
        level_progress = 100
    elif total_spent_rub >= 50000:
        level, level_next, level_percent = "Золотой", "Платиновый", 7
        level_progress = int((total_spent_rub - 50000) / 50000 * 100)
    elif total_spent_rub >= 15000:
        level, level_next, level_percent = "Серебряный", "Золотой", 5
        level_progress = int((total_spent_rub - 15000) / 35000 * 100)
    else:
        level, level_next, level_percent = "Гость", "Серебряный", 3
        level_progress = int(total_spent_rub / 15000 * 100)

    member_year = created_at.strftime("%Y") if created_at else ""
    MONTHS_RU = ["", "январе", "феврале", "марте", "апреле", "мае", "июне",
                 "июле", "августе", "сентябре", "октябре", "ноябре", "декабре"]
    member_since = f"{MONTHS_RU[created_at.month]} {member_year}" if created_at else ""

    cur.close()
    conn.close()

    return {
        "statusCode": 200,
        "headers": headers_resp,
        "body": json.dumps({
            "id": guest_id,
            "phone": phone,
            "name": name or "",
            "email": email or "",
            "bonuses": balance,
            "total_spent": total_spent_rub,
            "visits": earn_count,
            "level": level,
            "level_next": level_next,
            "level_percent": level_percent,
            "level_progress": min(level_progress, 99),
            "member_since": member_since,
            "transactions": transactions,
        }, ensure_ascii=False)
    }
