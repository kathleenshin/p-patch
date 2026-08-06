"""Compatibility wrapper for email delivery.

The notification system now routes through NotificationService and an injected
email provider, but this helper remains as a small facade for any existing call
sites that still expect a standalone function.
"""

from __future__ import annotations

from collections.abc import Sequence

from .notification_service import NotificationService


def send_email_notification(
    recipients: Sequence[str],
    subject: str,
    message: str,
):
    """Send an email using the default notification service."""

    service = NotificationService.from_settings()
    return service.send_email(
        recipients=recipients,
        subject=subject,
        message=message,
    )
