from __future__ import annotations

from django.conf import settings
from django.core.mail import send_mail

from .email_provider import EmailDeliveryError, EmailDeliveryResult, EmailProvider


class ConsoleEmailService(EmailProvider):
    """Email provider backed by Django's configured email backend."""

    def __init__(self, *, sender_email: str | None = None) -> None:
        self.sender_email = (
            sender_email
            or settings.NOTIFICATIONS_EMAIL_SENDER
        )

    @classmethod
    def from_settings(cls) -> "ConsoleEmailService":
        """Create a console provider using Django settings."""

        return cls()

    def send_email(
        self,
        *,
        subject: str,
        message: str,
        recipients: list[str],
        sender: str | None = None,
    ) -> EmailDeliveryResult:
        resolved_sender = sender or self.sender_email

        if not resolved_sender:
            raise EmailDeliveryError("Sender email is not configured.")

        if not recipients:
            return EmailDeliveryResult(
                message_id=None,
                provider_response={
                    "skipped": True,
                    "reason": "no_recipients",
                },
            )

        delivered_count = send_mail(
            subject=subject,
            message=message,
            from_email=resolved_sender,
            recipient_list=recipients,
            fail_silently=False,
        )

        return EmailDeliveryResult(
            message_id=None,
            provider_response={
                "backend": "django",
                "delivered_count": delivered_count,
            },
        )