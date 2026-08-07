from rest_framework.settings import api_settings
from rest_framework.throttling import AnonRateThrottle, SimpleRateThrottle


class _FreshRateMixin:
    """Re-read rates from settings so override_settings works in tests."""

    def get_rate(self):
        return api_settings.DEFAULT_THROTTLE_RATES[self.scope]


class AuthRegisterThrottle(_FreshRateMixin, AnonRateThrottle):
    """Limit new account creation (and confirmation emails) per IP."""

    scope = "auth_register"


class AuthResendIPThrottle(_FreshRateMixin, AnonRateThrottle):
    """Limit confirmation resends per IP."""

    scope = "auth_resend_ip"


class AuthResendEmailThrottle(_FreshRateMixin, SimpleRateThrottle):
    """Limit confirmation resends per target email (stops inbox bombing)."""

    scope = "auth_resend_email"

    def get_cache_key(self, request, view):
        email = ""
        if hasattr(request, "data"):
            raw = request.data.get("email") or ""
            email = str(raw).strip().lower()
        if not email:
            return None
        return self.cache_format % {"scope": self.scope, "ident": email}
