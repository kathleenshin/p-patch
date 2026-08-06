from django.conf import settings
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode

# Shared outbound mail path (SES/console); keep auth off raw send_mail.
from notifications.services.email import send_email_notification

from .tokens import email_confirmation_token


def build_confirmation_link(user) -> str:
    uid = urlsafe_base64_encode(force_bytes(user.pk))
    token = email_confirmation_token.make_token(user)
    frontend = settings.FRONTEND_URL  # already stripped in settings
    return f"{frontend}/?confirm_email=1&uid={uid}&token={token}"


def send_confirmation_email(user) -> int:
    """Build confirm content in auth; deliver via notifications (SES-ready)."""
    link = build_confirmation_link(user)
    subject = "Confirm your Judkins Park P-Patch account"
    message = (
        "Thanks for registering with Judkins Park P-Patch.\n\n"
        "Please confirm your email address by opening this link:\n"
        f"{link}\n\n"
        "If you did not create an account, you can ignore this message."
    )
    # Hand off delivery so SES config stays centralized in notifications.
    return send_email_notification(
        recipients=[user.email],
        subject=subject,
        message=message,
    )
