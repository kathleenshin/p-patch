from datetime import timedelta

from django.db.models import Q
from django.template.loader import render_to_string
from django.utils import timezone

from help_requests.models import HelpRequest
from plots.models import Garden

from .email_provider import EmailDeliveryResult
from .notification_service import NotificationService
from .recipients import get_weekly_summary_recipient_emails


def get_weekly_help_requests(garden: Garden):
    week_ago = timezone.now() - timedelta(days=7)

    recent_standard_requests = Q(
        priority__in=[
            HelpRequest.Priority.LOW,
            HelpRequest.Priority.MEDIUM,
        ],
        created_at__gte=week_ago,
        assigned_to__isnull=True,
    )

    unclaimed_urgent_requests = Q(
        priority=HelpRequest.Priority.HIGH,
        assigned_to__isnull=True,
    )

    return (
        HelpRequest.objects.filter(
            garden=garden,
            status=HelpRequest.Status.ACTIVE,
        )
        .filter(
            recent_standard_requests
            | unclaimed_urgent_requests
        )
        .order_by("-priority", "-created_at")
    )


def notify_weekly_summary_for_garden(
    garden: Garden,
    notification_service: NotificationService | None = None,
) -> EmailDeliveryResult:
    """Send the weekly summary to active plot stewards and garden admins."""

    recipients = get_weekly_summary_recipient_emails(garden)
    help_requests = get_weekly_help_requests(garden)

    service = notification_service or NotificationService.from_settings()

    subject = f"Weekly summary for {garden.name}"

    message = render_to_string(
        "notifications/weekly_summary.txt",
        {
            "garden": garden,
            "help_requests": help_requests,
        },
    ).strip()

    return service.send_email(
        recipients=recipients,
        subject=subject,
        message=message,
    )