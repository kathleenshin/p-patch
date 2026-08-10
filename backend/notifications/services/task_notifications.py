from django.template.loader import render_to_string

from help_requests.models import HelpRequest

from .email_provider import EmailDeliveryResult
from .notification_service import NotificationService
from .recipients import (
    get_active_garden_member_emails,
    get_urgent_help_request_recipient_emails,
)


def _help_request_location(help_request: HelpRequest) -> str:
    if help_request.plot:
        return (
            f"Plot {help_request.plot.plot_number} at {help_request.garden.name}"
        )
    return help_request.garden.name


def _help_request_message(help_request: HelpRequest) -> str:
    # Uses .txt email template
    # TODO: Create HTML email template for help request notifications
    return render_to_string(
        "notifications/help_request.txt",
        {
            "help_request": help_request,
            "location": _help_request_location(help_request),
        },
    ).strip()


def notify_new_help_request(
    help_request: HelpRequest,
    notification_service: NotificationService | None = None,
) -> EmailDeliveryResult:
    """Notify active garden members about a new (or resent) help request."""

    recipients = get_active_garden_member_emails(help_request.garden)
    service = notification_service or NotificationService.from_settings()

    if help_request.plot:
        subject = f"New help request for Plot {help_request.plot.plot_number}"
    else:
        subject = "New garden help request"

    return service.send_email(
        recipients=recipients,
        subject=subject,
        message=_help_request_message(help_request),
    )


def notify_urgent_help_request(
    help_request: HelpRequest,
    notification_service: NotificationService | None = None,
) -> EmailDeliveryResult:
    """Notify plot stewards and admins about a HIGH-priority help request."""

    recipients = get_urgent_help_request_recipient_emails(
        help_request.garden
    )
    service = notification_service or NotificationService.from_settings()

    if help_request.plot:
        subject = f"Urgent help request for Plot {help_request.plot.plot_number}"
    else:
        subject = "Urgent garden help request"

    return service.send_email(
        recipients=recipients,
        subject=subject,
        message=_help_request_message(help_request),
    )
