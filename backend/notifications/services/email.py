from django.conf import settings
from django.core.mail import send_mail

# TODO: implement logging for email notifications
def send_email_notification(
    recipients: list[str],
    subject: str,
    message: str,
) -> int:

    if not recipients:
        return 0

    return send_mail(
        subject=subject,
        message=message,
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=recipients,
        fail_silently=False,
    )