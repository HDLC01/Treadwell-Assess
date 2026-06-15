"""Email delivery — provider-agnostic SMTP via stdlib smtplib.

Unconfigured by default: `is_configured()` is False until SMTP_HOST + SMTP_FROM are
set, and `send()` raises EmailError(503-able) so the API degrades gracefully. Works
with any SMTP relay (Gmail app password, the wetreadwell mail server, SendGrid SMTP…).
"""

from __future__ import annotations

import smtplib
from email.message import EmailMessage
from typing import Iterable, Optional, Tuple

from config import settings

# (filename, bytes, "mime/type")
Attachment = Tuple[str, bytes, str]


class EmailError(Exception):
    def __init__(self, detail: str, status: int = 503):
        super().__init__(detail)
        self.detail = detail
        self.status = status


def is_configured() -> bool:
    return settings.email_enabled


def send(
    to: str,
    subject: str,
    body_text: str,
    attachments: Optional[Iterable[Attachment]] = None,
) -> None:
    if not settings.email_enabled:
        raise EmailError("Email isn't configured on this server (set SMTP_HOST / SMTP_FROM).")

    msg = EmailMessage()
    msg["From"] = settings.SMTP_FROM
    msg["To"] = to
    msg["Subject"] = subject
    msg.set_content(body_text)
    for filename, data, mime in attachments or []:
        maintype, _, subtype = mime.partition("/")
        msg.add_attachment(data, maintype=maintype, subtype=subtype or "octet-stream", filename=filename)

    try:
        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=20) as smtp:
            if settings.SMTP_STARTTLS:
                smtp.starttls()
            if settings.SMTP_USER:
                smtp.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            smtp.send_message(msg)
    except EmailError:
        raise
    except Exception as exc:  # network / auth / relay failure
        raise EmailError(f"Could not send the email: {exc}", status=502) from exc
