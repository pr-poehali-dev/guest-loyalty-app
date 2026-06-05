import json
import os
import psycopg2

SCHEMA = "t_p70437429_guest_loyalty_app"


def get_conn():
    return psycopg2.connect(os.environ["DATABASE_URL"])


def get_guest_id_from_token(cur, token: str):
    cur.execute(
        f"SELECT g.id FROM {SCHEMA}.sessions s JOIN {SCHEMA}.guests g ON g.id = s.guest_id WHERE s.token = %s AND s.expires_at > NOW()",
        (token,)
    )
    row = cur.fetchone()
    return row[0] if row else None


def handler(event: dict, context) -> dict:
    """История бонусных операций гостя."""
    cors = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, X-Session-Token",
    }

    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": cors, "body": ""}

    token = event.get("headers", {}).get("X-Session-Token", "")
    if not token:
        return {"statusCode": 401, "headers": cors, "body": json.dumps({"error": "Не авторизован"})}

    conn = get_conn()
    cur = conn.cursor()
    guest_id = get_guest_id_from_token(cur, token)

    if not guest_id:
        cur.close()
        conn.close()
        return {"statusCode": 401, "headers": cors, "body": json.dumps({"error": "Сессия истекла"})}

    cur.execute(
        f"""SELECT id, type, amount, description, created_at
            FROM {SCHEMA}.bonus_transactions
            WHERE guest_id = %s
            ORDER BY created_at DESC
            LIMIT 50""",
        (guest_id,)
    )
    rows = cur.fetchall()
    cur.close()
    conn.close()

    operations = [
        {
            "id": r[0],
            "type": r[1],
            "amount": r[2],
            "description": r[3],
            "date": r[4].strftime("%-d %B %Y") if r[4] else "",
        }
        for r in rows
    ]

    return {
        "statusCode": 200,
        "headers": cors,
        "body": json.dumps({"operations": operations}, ensure_ascii=False),
    }
