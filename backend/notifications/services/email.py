from django.conf import settings
from django.core.mail import send_mail

# TODO: implement logging for email notifications
def send_email_notification(
    recipients: list[str],
    subject: str,
    message: str,
) -> int:
    """Send one message to all recipients. Returns address count (not Django's message count)."""

    if not recipients:
        return 0

    # send_mail returns 0 or 1 (messages), not len(recipient_list).
    send_mail(
        subject=subject,
        message=message,
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=recipients,
        fail_silently=False,
    )
    return len(recipients)
