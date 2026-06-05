import json
import os
import random
import string
from datetime import datetime, timedelta
import psycopg2
import urllib.request
import urllib.parse

SCHEMA = "t_p70437429_guest_loyalty_app"

def get_db():
    return psycopg2.connect(os.environ["DATABASE_URL"])

def handler(event: dict, context) -> dict:
    """Отправляет OTP-код на номер телефона через SMS.ru"""
    cors = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
    }

    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": cors, "body": ""}

    try:
        body = json.loads(event.get("body") or "{}")
        phone = (body.get("phone") or "").strip()
        if not phone:
            return {"statusCode": 400, "headers": cors, "body": json.dumps({"error": "Укажите номер телефона"})}

        # Нормализуем номер
        digits = "".join(c for c in phone if c.isdigit())
        if len(digits) == 11 and digits[0] in ("7", "8"):
            digits = "7" + digits[1:]
        elif len(digits) == 10:
            digits = "7" + digits
        if len(digits) != 11 or digits[0] != "7":
            return {"statusCode": 400, "headers": cors, "body": json.dumps({"error": "Неверный формат номера телефона"})}
        phone_norm = "+" + digits

        # Генерируем код
        code = "".join(random.choices(string.digits, k=4))
        expires_at = datetime.now() + timedelta(minutes=10)

        # Сохраняем в БД
        conn = get_db()
        cur = conn.cursor()
        cur.execute(
            f"INSERT INTO {SCHEMA}.otp_codes (phone, code, expires_at) VALUES (%s, %s, %s)",
            (phone_norm, code, expires_at)
        )
        conn.commit()
        cur.close()
        conn.close()

        # Отправляем SMS через SMS.ru
        api_key = os.environ.get("SMSRU_API_KEY", "")
        sms_sent = False
        if api_key:
            params = urllib.parse.urlencode({
                "api_id": api_key,
                "to": digits,
                "msg": f"Фридом Виладж: ваш код входа {code}. Действует 10 минут.",
                "json": 1,
            })
            req = urllib.request.Request(
                f"https://sms.ru/sms/send?{params}",
                method="GET"
            )
            with urllib.request.urlopen(req, timeout=10) as resp:
                sms_result = json.loads(resp.read())
                sms_sent = sms_result.get("status") == "OK"

        return {
            "statusCode": 200,
            "headers": cors,
            "body": json.dumps({
                "ok": True,
                "phone": phone_norm,
                "sms_sent": sms_sent,
                # В тестовом режиме возвращаем код (убрать в проде при наличии ключа)
                **({"debug_code": code} if not api_key else {}),
            })
        }
    except Exception as e:
        return {"statusCode": 500, "headers": cors, "body": json.dumps({"error": str(e)})}
