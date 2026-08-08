from django.template.loader import render_to_string

from help_requests.models import HelpRequest

from .email_provider import EmailDeliveryResult
from .notification_service import NotificationService
from .recipients import get_active_garden_member_emails


def notify_new_help_request(
    help_request: HelpRequest,
    notification_service: NotificationService | None = None,
) -> EmailDeliveryResult:
    """Notify active garden members about a new help request."""

    recipients = get_active_garden_member_emails(help_request.garden)
    service = notification_service or NotificationService.from_settings()

    if help_request.plot:
        plot_label = f"Plot {help_request.plot.plot_number}"
        subject = f"New help request for {plot_label}"
        location = f"{plot_label} at {help_request.garden.name}"
    else:
        subject = "New garden help request"
        location = help_request.garden.name

    # Uses .txt email template
    # TODO: Create HTML email template for help request notifications
    message = render_to_string(
        "notifications/help_request.txt",
        {
            "help_request": help_request,
            "location": location,
        },
    ).strip()

    return service.send_email(
        recipients=recipients,
        subject=subject,
        message=message,
    )