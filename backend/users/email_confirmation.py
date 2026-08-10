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
    name = (user.first_name or "").strip() or "there"
    subject = "Confirm your email — Judkins Park P-Patch"
    message = (
        f"Hi {name},\n\n"
        "Welcome to Judkins Park P-Patch Gardening.\n\n"
        "Thanks for creating an account. Please confirm this email address so we "
        "know it belongs to you. Until you confirm, you won't be able to log in.\n\n"
        "Confirm your email by opening this link:\n"
        f"{link}\n\n"
        "After you confirm, a garden admin still needs to approve your membership "
        "before you can use Plots, Tasks, and Inventory. You'll see a pending "
        "status in the app until that happens.\n\n"
        "If the link doesn't open, copy and paste it into your browser. "
        "If you didn't create this account, you can ignore this message.\n\n"
        "- Judkins Park P-Patch"
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
    name = (user.first_name or "").strip() or "there"
    subject = "Confirm your new email — Judkins Park P-Patch"
    message = (
        f"Hi {name},\n\n"
        "We received a request to change the email on your Judkins Park P-Patch "
        "account to this address.\n\n"
        "Confirm the change by opening this link:\n"
        f"{link}\n\n"
        f"Your current login email ({user.email}) stays active until you confirm. "
        "After you confirm, you'll sign in with this new address.\n\n"
        "If you didn't request this change, ignore this message — nothing will "
        "change on your account.\n\n"
        "- Judkins Park P-Patch"
    )
    service = NotificationService.from_settings()
    return service.send_email(
        recipients=[user.pending_email],
        subject=subject,
        message=message,
    )
