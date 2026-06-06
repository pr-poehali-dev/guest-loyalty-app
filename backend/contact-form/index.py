import json
import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

SCHEMA = "t_p70437429_guest_loyalty_app"

SMTP_HOST = "smtp.mail.ru"
SMTP_PORT = 465


def handler(event: dict, context) -> dict:
    """Отправка сообщения от гостя на почту администратора через SMTP mail.ru."""
    cors = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
    }

    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": cors, "body": ""}

    if event.get("httpMethod") != "POST":
        return {"statusCode": 405, "headers": cors, "body": json.dumps({"error": "Method not allowed"})}

    body = json.loads(event.get("body") or "{}")
    guest_name    = (body.get("name") or "").strip()
    guest_message = (body.get("message") or "").strip()
    guest_phone   = (body.get("phone") or "").strip()

    if not guest_message:
        return {"statusCode": 400, "headers": cors, "body": json.dumps({"error": "Сообщение не может быть пустым"})}

    smtp_email    = os.environ["SMTP_EMAIL"]
    smtp_password = os.environ["SMTP_PASSWORD"]
    to_email      = os.environ.get("CONTACT_EMAIL", smtp_email)

    subject = f"Сообщение от гостя — Фридом Виладж"
    if guest_name:
        subject += f" ({guest_name})"

    lines = []
    if guest_name:
        lines.append(f"Имя: {guest_name}")
    if guest_phone:
        lines.append(f"Телефон: {guest_phone}")
    lines.append("")
    lines.append(f"Сообщение:\n{guest_message}")

    text_body = "\n".join(lines)

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"]    = smtp_email
    msg["To"]      = to_email
    msg.attach(MIMEText(text_body, "plain", "utf-8"))

    with smtplib.SMTP_SSL(SMTP_HOST, SMTP_PORT) as server:
        server.login(smtp_email, smtp_password)
        server.sendmail(smtp_email, to_email, msg.as_string())

    return {"statusCode": 200, "headers": cors, "body": json.dumps({"ok": True}, ensure_ascii=False)}
