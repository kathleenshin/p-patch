from help_requests.models import HelpRequest

from .email_provider import EmailDeliveryResult
from .notification_service import NotificationService
from .recipients import get_active_garden_member_emails


def notify_new_help_request(
    help_request: HelpRequest,
    notification_service: NotificationService | None = None,
) -> EmailDeliveryResult:
    """Notify garden members about a newly created help request.

    Recipient selection stays separate from delivery so the same notification
    service can be reused by other plot-related workflows later.
    """

    recipients = get_active_garden_member_emails(help_request.garden)
    service = notification_service or NotificationService.from_settings()

    if help_request.plot:
        subject = (
            f"New help request for Plot "
            f"{help_request.plot.plot_number}"
        )

        location = (
            f"Plot {help_request.plot.plot_number} "
            f"at {help_request.garden.name}"
        )
    else:
        subject = f"New garden help request"

        location = help_request.garden.name

    message = (
        f"A new help request has been posted for {location}.\n\n"
        f"Task: {help_request.title}\n"
        f"Description: {help_request.description}"
    )

    return service.send_email(recipients=recipients, subject=subject, message=message)