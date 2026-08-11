from django.contrib.auth.tokens import PasswordResetTokenGenerator


class EmailConfirmationTokenGenerator(PasswordResetTokenGenerator):
    """One-time token invalidated once the user becomes active (email confirmed)."""

    def _make_hash_value(self, user, timestamp):
        return f"{user.pk}{user.email}{user.is_active}{timestamp}"


class EmailChangeTokenGenerator(PasswordResetTokenGenerator):
    """Token for confirm-before-switch email changes; tied to pending_email."""

    def _make_hash_value(self, user, timestamp):
        pending = user.pending_email or ""
        return f"{user.pk}{user.email}{pending}{timestamp}"


email_confirmation_token = EmailConfirmationTokenGenerator()
email_change_token = EmailChangeTokenGenerator()
