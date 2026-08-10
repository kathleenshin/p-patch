from __future__ import annotations

from collections.abc import Sequence

from .email_provider import EmailDeliveryResult
from .notification_service import NotificationService


def send_email_notification(
        *,
        recipients: Sequence[str] | None,
        subject: str,
        message: str,
        notification_service: NotificationService | None = None,
) -> EmailDeliveryResult:
    """Compatibility wrapper for existing callers that expect a mail helper."""

    service = notification_service or NotificationService.from_settings()

    return service.send_email(
        recipients=recipients,
        subject=subject,
        message=message,
    )