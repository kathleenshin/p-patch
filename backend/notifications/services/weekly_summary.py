from django.template.loader import render_to_string

from plots.models import Garden

from .email_provider import EmailDeliveryResult
from .notification_service import NotificationService
from .recipients import get_weekly_summary_recipient_emails


def notify_weekly_summary_for_garden(
    garden: Garden,
    notification_service: NotificationService | None = None,
) -> EmailDeliveryResult:
    """Send the weekly summary to active plot stewards and garden admins."""

    recipients = get_weekly_summary_recipient_emails(garden)
    service = notification_service or NotificationService.from_settings()

    subject = f"Weekly summary for {garden.name}"
    message = render_to_string(
        "notifications/weekly_summary.txt",
        {
            "garden": garden,
        },
    ).strip()

    return service.send_email(
        recipients=recipients,
        subject=subject,
        message=message,
    )