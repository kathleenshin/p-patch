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


def _claimed_by_label(help_request: HelpRequest) -> str:
    assignee = help_request.assigned_to
    if assignee is None:
        return "another gardener"

    display_name = (
        f"{assignee.first_name} {assignee.last_name}"
    ).strip()
    if display_name and assignee.email:
        return f"{display_name} ({assignee.email})"
    if display_name:
        return display_name
    if assignee.email:
        return assignee.email
    return "another gardener"


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


def notify_help_request_claimed(
    help_request: HelpRequest,
    notification_service: NotificationService | None = None,
) -> EmailDeliveryResult | None:
    """Notify the task creator when someone else claims their request."""

    creator = help_request.created_by
    assignee = help_request.assigned_to
    creator_email = (creator.email or "").strip() if creator else ""

    if not creator_email:
        return None

    if assignee is None:
        return None

    if creator.pk == assignee.pk:
        return None

    service = notification_service or NotificationService.from_settings()
    location = _help_request_location(help_request)
    subject = f"Your help request was claimed: {help_request.title}"
    message = (
        f"Your help request '{help_request.title}' has been claimed.\n\n"
        f"Claimed by: {_claimed_by_label(help_request)}\n"
        f"Location: {location}\n\n"
        "A gardener has started working on your request."
    )

    return service.send_email(
        recipients=[creator_email],
        subject=subject,
        message=message,
    )
