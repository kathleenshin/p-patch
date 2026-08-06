from .email import send_email_notification
from .recipients import get_active_garden_member_emails


def notify_new_help_request(help_request) -> int:
    recipients = get_active_garden_member_emails(help_request.garden)

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

    return send_email_notification(
        recipients,
        subject,
        message,
    )