from django.contrib.auth.tokens import PasswordResetTokenGenerator


class EmailConfirmationTokenGenerator(PasswordResetTokenGenerator):
    """One-time token invalidated once the user becomes active (email confirmed)."""

    def _make_hash_value(self, user, timestamp):
        return f"{user.pk}{user.email}{user.is_active}{timestamp}"


email_confirmation_token = EmailConfirmationTokenGenerator()
