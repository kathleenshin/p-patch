from django.conf import settings
from django.core.mail import send_mail
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode

from .tokens import email_confirmation_token


def build_confirmation_link(user) -> str:
    uid = urlsafe_base64_encode(force_bytes(user.pk))
    token = email_confirmation_token.make_token(user)
    frontend = settings.FRONTEND_URL  # already stripped in settings
    return f"{frontend}/?confirm_email=1&uid={uid}&token={token}"


def send_confirmation_email(user) -> int:
    """Send the verify-registration email via Django's email backend (SES in prod)."""
    link = build_confirmation_link(user)
    subject = "Confirm your Judkins Park P-Patch account"
    message = (
        "Thanks for registering with Judkins Park P-Patch.\n\n"
        "Please confirm your email address by opening this link:\n"
        f"{link}\n\n"
        "If you did not create an account, you can ignore this message."
    )
    return send_mail(
        subject=subject,
        message=message,
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[user.email],
        fail_silently=False,
    )
