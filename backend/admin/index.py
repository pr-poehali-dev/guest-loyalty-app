import json
import os
import psycopg2
import urllib.request
import urllib.parse

SCHEMA = "t_p70437429_guest_loyalty_app"
TELEGRAM_CHAT_ID = "6893050478"


def get_conn():
    return psycopg2.connect(os.environ["DATABASE_URL"])


def cors():
    return {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, X-Admin-Password",
    }


def ok(data: dict):
    return {"statusCode": 200, "headers": cors(), "body": json.dumps(data, ensure_ascii=False, default=str)}


def err(msg: str, code: int = 400):
    return {"statusCode": code, "headers": cors(), "body": json.dumps({"error": msg})}


def check_auth(event: dict) -> bool:
    password = os.environ.get("ADMIN_PASSWORD", "")
    if not password:
        return True  # если пароль не задан — пропускаем (для первого запуска)
    given = (event.get("headers") or {}).get("X-Admin-Password", "")
    return given == password


CONTACT_KEYS = ["contact_phone", "contact_whatsapp", "contact_email", "contact_address", "contact_hours", "contact_website"]


def handler(event: dict, context) -> dict:
    """Панель администратора: управление гостями, бонусами и контактами."""

    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": cors(), "body": ""}

    # Публичное сообщение от гостя — без пароля
    if event.get("httpMethod") == "POST":
        _body = json.loads(event.get("body") or "{}")
        if _body.get("action") == "contact_message":
            guest_name = (_body.get("name") or "Аноним").strip()
            guest_msg  = (_body.get("message") or "").strip()
            guest_phone = (_body.get("phone") or "").strip()
            if not guest_msg:
                return err("Напишите сообщение")
            token = os.environ.get("TELEGRAM_BOT_TOKEN", "")
            if token:
                text = (
                    f"📩 <b>Новое сообщение от гостя</b>\n\n"
                    f"👤 Имя: {guest_name}\n"
                    + (f"📱 Телефон: {guest_phone}\n" if guest_phone else "")
                    + f"\n💬 {guest_msg}"
                )
                params = urllib.parse.urlencode({
                    "chat_id": TELEGRAM_CHAT_ID,
                    "text": text,
                    "parse_mode": "HTML",
                })
                req = urllib.request.Request(
                    f"https://api.telegram.org/bot{token}/sendMessage?{params}"
                )
                try:
                    urllib.request.urlopen(req, timeout=10)
                except Exception as e:
                    return err(f"Ошибка отправки: {e}")
            return ok({"ok": True})

    # Публичный запрос контактов — без пароля
    if event.get("httpMethod") == "GET":
        qs_pre = event.get("queryStringParameters") or {}
        if qs_pre.get("type") == "public_settings":
            conn_p = get_conn(); cur_p = conn_p.cursor()
            cur_p.execute(f"SELECT key, value FROM {SCHEMA}.settings WHERE key = ANY(%s)", (CONTACT_KEYS,))
            settings = {r[0]: r[1] for r in cur_p.fetchall()}
            cur_p.close(); conn_p.close()
            return ok({"settings": settings})

    if not check_auth(event):
        return err("Неверный пароль администратора", 401)

    method = event.get("httpMethod", "GET")
    body = json.loads(event.get("body") or "{}")
    action = body.get("action", "")

    conn = get_conn()
    cur = conn.cursor()

    # ── GET: список гостей + настройки контактов ───────────────────
    if method == "GET":
        qs = event.get("queryStringParameters") or {}
        search = (qs.get("search") or "").strip()

        # Запрос настроек для админа
        if qs.get("type") == "settings":
            cur.execute(f"SELECT key, value FROM {SCHEMA}.settings WHERE key = ANY(%s)", (CONTACT_KEYS,))
            settings = {r[0]: r[1] for r in cur.fetchall()}
            cur.close(); conn.close()
            return ok({"settings": settings})

        if search:
            cur.execute(
                f"""SELECT id, phone, name, birth_date, email, bonuses, total_spent, visits, level,
                           notifications, created_at
                    FROM {SCHEMA}.guests
                    WHERE phone ILIKE %s OR name ILIKE %s
                    ORDER BY created_at DESC
                    LIMIT 50""",
                (f"%{search}%", f"%{search}%")
            )
        else:
            cur.execute(
                f"""SELECT id, phone, name, birth_date, email, bonuses, total_spent, visits, level,
                           notifications, created_at
                    FROM {SCHEMA}.guests
                    ORDER BY created_at DESC
                    LIMIT 100"""
            )

        guests = []
        for r in cur.fetchall():
            guests.append({
                "id": r[0], "phone": r[1], "name": r[2],
                "birth_date": r[3].isoformat() if r[3] else None,
                "email": r[4], "bonuses": r[5] or 0,
                "total_spent": float(r[6] or 0), "visits": r[7] or 0,
                "level": r[8] or "Гость",
                "notifications": r[9] if r[9] is not None else True,
                "created_at": r[10].strftime("%d.%m.%Y") if r[10] else "",
            })

        # Статистика
        cur.execute(f"SELECT COUNT(*), COALESCE(SUM(bonuses),0) FROM {SCHEMA}.guests")
        total_guests, total_bonuses = cur.fetchone()

        cur.execute(f"SELECT COUNT(*) FROM {SCHEMA}.bonus_transactions WHERE type='earn'")
        total_earn_ops = cur.fetchone()[0]

        cur.close()
        conn.close()
        return ok({"guests": guests, "stats": {
            "total_guests": total_guests,
            "total_bonuses": int(total_bonuses),
            "total_earn_ops": total_earn_ops,
        }})

    # ── POST: операции с бонусами и данными ────────────────────────
    if method == "POST":

        # Начислить/списать бонусы
        if action in ("earn", "spend"):
            guest_id    = body.get("guest_id")
            amount      = int(body.get("amount") or 0)
            description = (body.get("description") or "").strip() or ("Начисление администратором" if action == "earn" else "Списание администратором")

            if not guest_id or amount <= 0:
                cur.close(); conn.close()
                return err("Укажите гостя и сумму")

            # Проверяем гостя
            cur.execute(f"SELECT id, bonuses FROM {SCHEMA}.guests WHERE id = %s", (guest_id,))
            row = cur.fetchone()
            if not row:
                cur.close(); conn.close()
                return err("Гость не найден", 404)

            current_bonuses = row[1] or 0
            if action == "spend" and current_bonuses < amount:
                cur.close(); conn.close()
                return err(f"Недостаточно бонусов. Доступно: {current_bonuses}")

            # Записываем транзакцию
            cur.execute(
                f"INSERT INTO {SCHEMA}.bonus_transactions (guest_id, type, amount, description) VALUES (%s, %s, %s, %s)",
                (guest_id, action, amount, description)
            )

            # Обновляем баланс
            if action == "earn":
                new_balance = current_bonuses + amount
            else:
                new_balance = current_bonuses - amount

            cur.execute(f"UPDATE {SCHEMA}.guests SET bonuses = %s, updated_at = NOW() WHERE id = %s", (new_balance, guest_id))
            conn.commit()
            cur.close(); conn.close()
            return ok({"ok": True, "new_balance": new_balance})

        # Обновить данные гостя
        if action == "update_guest":
            guest_id    = body.get("guest_id")
            name        = body.get("name")
            email       = body.get("email")
            birth_date  = body.get("birth_date")
            total_spent = body.get("total_spent")
            visits      = body.get("visits")
            level       = body.get("level")

            if not guest_id:
                cur.close(); conn.close()
                return err("Укажите гостя")

            cur.execute(
                f"""UPDATE {SCHEMA}.guests SET
                    name        = COALESCE(%s, name),
                    email       = COALESCE(%s, email),
                    birth_date  = COALESCE(%s::date, birth_date),
                    total_spent = COALESCE(%s::numeric, total_spent),
                    visits      = COALESCE(%s::int, visits),
                    level       = COALESCE(%s, level),
                    updated_at  = NOW()
                    WHERE id = %s
                    RETURNING id, bonuses, total_spent, visits, level""",
                (name, email, birth_date, total_spent, visits, level, guest_id)
            )
            row = cur.fetchone()
            conn.commit()
            cur.close(); conn.close()
            if not row:
                return err("Гость не найден", 404)
            return ok({"ok": True, "guest_id": row[0], "bonuses": row[1], "total_spent": float(row[2] or 0), "visits": row[3], "level": row[4]})

        # Сообщение от гостя — без авторизации (публичный action)
        # обрабатывается ниже отдельно, сюда не попадёт

        # Сохранить настройки контактов
        if action == "save_settings":
            settings = body.get("settings") or {}
            for key in CONTACT_KEYS:
                if key in settings:
                    cur.execute(
                        f"INSERT INTO {SCHEMA}.settings (key, value, updated_at) VALUES (%s, %s, NOW()) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()",
                        (key, settings[key])
                    )
            conn.commit()
            cur.close(); conn.close()
            return ok({"ok": True})

        cur.close(); conn.close()
        return err("Неизвестное действие")

    cur.close(); conn.close()
    return err("Метод не поддерживается", 405)