from django.conf import settings
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode

# Shared outbound mail path (console/SES); keep auth off raw send_mail.
from notifications.services.email_provider import EmailDeliveryResult
from notifications.services.notification_service import NotificationService

from .tokens import email_change_token, email_confirmation_token


def build_confirmation_link(user) -> str:
    uid = urlsafe_base64_encode(force_bytes(user.pk))
    token = email_confirmation_token.make_token(user)
    frontend = settings.FRONTEND_URL  # already stripped in settings
    return f"{frontend}/?confirm_email=1&uid={uid}&token={token}"


def send_confirmation_email(user) -> EmailDeliveryResult:
    """Build confirm content in auth; deliver via NotificationService."""
    link = build_confirmation_link(user)
    subject = "Confirm your Judkins Park P-Patch account"
    message = (
        "Thanks for registering with Judkins Park P-Patch.\n\n"
        "Please confirm your email address by opening this link:\n"
        f"{link}\n\n"
        "If you did not create an account, you can ignore this message."
    )
    # Same path as help-request notify: console locally, SES when configured.
    service = NotificationService.from_settings()
    return service.send_email(
        recipients=[user.email],
        subject=subject,
        message=message,
    )


def build_email_change_link(user) -> str:
    """Link emailed to the *new* address; confirm switches user.email."""
    uid = urlsafe_base64_encode(force_bytes(user.pk))
    token = email_change_token.make_token(user)
    frontend = settings.FRONTEND_URL
    return f"{frontend}/?confirm_email_change=1&uid={uid}&token={token}"


def send_email_change_confirmation(user) -> EmailDeliveryResult:
    """Send confirm-before-switch mail to pending_email only."""
    if not user.pending_email:
        raise ValueError("User has no pending_email to confirm.")
    link = build_email_change_link(user)
    subject = "Confirm your new Judkins Park P-Patch email"
    message = (
        "You requested to change the email on your Judkins Park P-Patch account.\n\n"
        "Confirm this new address by opening this link:\n"
        f"{link}\n\n"
        "Until you confirm, your account keeps using the previous email.\n"
        "If you did not request this change, you can ignore this message."
    )
    service = NotificationService.from_settings()
    return service.send_email(
        recipients=[user.pending_email],
        subject=subject,
        message=message,
    )