"""Provider-agnostic notification orchestration.

This module owns notification business rules and knows nothing about boto3,
AWS credentials, IAM policies, or deployment plumbing. Those concerns stay in
the SES provider implementation so the application can swap providers later
without rewriting notification logic.
"""

from __future__ import annotations

from collections.abc import Sequence

from django.conf import settings

from .email_provider import EmailDeliveryError, EmailDeliveryResult, EmailProvider
from .ses_email import SESEmailService


class NotificationService:
    """High-level notification service that depends on an email provider."""

    def __init__(
        self,
        email_provider: EmailProvider,
        *,
        sender_email: str | None = None,
        default_recipients: Sequence[str] | None = None,
    ) -> None:
        self.email_provider = email_provider
        self.sender_email = sender_email or getattr(settings, "NOTIFICATIONS_EMAIL_SENDER", None)
        configured_recipients = (
            default_recipients
            if default_recipients is not None
            else getattr(settings, "NOTIFICATIONS_RECIPIENTS", ())
        )
        self.default_recipients = tuple(configured_recipients)

    @classmethod
    def from_settings(
        cls,
        *,
        email_provider: EmailProvider | None = None,
        sender_email: str | None = None,
        default_recipients: Sequence[str] | None = None,
    ) -> "NotificationService":
        """Build a notification service from Django settings placeholders."""

        provider = email_provider or SESEmailService.from_settings()
        return cls(
            provider,
            sender_email=sender_email,
            default_recipients=default_recipients,
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

        resolved_recipients = list(
            self.default_recipients if recipients is None else recipients,
        )
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
