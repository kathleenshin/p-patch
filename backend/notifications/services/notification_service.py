from __future__ import annotations

from collections.abc import Sequence

from django.conf import settings

from .console_email import ConsoleEmailService
from .email_provider import EmailDeliveryError, EmailDeliveryResult, EmailProvider
from .ses_email import SESEmailService


class NotificationService:
    """Coordinates email notifications through a configured provider."""

    def __init__(
        self,
        email_provider: EmailProvider,
        *,
        sender_email: str | None = None,
    ) -> None:
        self.email_provider = email_provider
        self.sender_email = (
            sender_email
            or settings.NOTIFICATIONS_EMAIL_SENDER
        )

    @classmethod
    def from_settings(
        cls,
        *,
        email_provider: EmailProvider | None = None,
        sender_email: str | None = None,
    ) -> "NotificationService":
        """Build a notification service from Django settings."""

        provider = email_provider or cls._provider_from_settings()

        return cls(
            provider,
            sender_email=sender_email,
        )

    @staticmethod
    def _provider_from_settings() -> EmailProvider:
        provider_name = settings.EMAIL_PROVIDER.lower()

        if provider_name == "console":
            return ConsoleEmailService.from_settings()

        if provider_name == "ses":
            return SESEmailService.from_settings()

        raise ValueError(
            f"Unsupported email provider: {settings.EMAIL_PROVIDER}"
        )

    def send_email(
        self,
        *,
        subject: str,
        message: str,
        recipients: Sequence[str] | None = None,
        sender: str | None = None,
    ) -> EmailDeliveryResult:
        resolved_sender = sender or self.sender_email

        if not resolved_sender:
            raise EmailDeliveryError("Sender email is not configured.")

        resolved_recipients = list(recipients or [])

        if not resolved_recipients:
            return EmailDeliveryResult(
                message_id=None,
                provider_response={
                    "skipped": True,
                    "reason": "no_recipients",
                },
            )

        return self.email_provider.send_email(
            sender=resolved_sender,
            recipients=resolved_recipients,
            subject=subject,
            message=message,
        )