"""
Throttle tests for register / resend-confirmation.

Uses low rates via override_settings so the shared test suite stays fast.
"""

from django.core.cache import cache
from django.test import override_settings
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from users.models import User


@override_settings(
    REST_FRAMEWORK={
        "DEFAULT_AUTHENTICATION_CLASSES": (
            "rest_framework_simplejwt.authentication.JWTAuthentication",
        ),
        "DEFAULT_PERMISSION_CLASSES": (
            "rest_framework.permissions.IsAuthenticated",
        ),
        "DEFAULT_THROTTLE_RATES": {
            "auth_register": "2/min",
            "auth_resend_ip": "100/min",
            "auth_resend_email": "2/min",
        },
    },
)
class AuthThrottleTests(APITestCase):
    PASSWORD = "password1"

    def setUp(self):
        cache.clear()
        self.register_url = reverse("auth-register")
        self.resend_url = reverse("auth-resend-confirmation")

    def test_register_throttled_after_limit(self):
        for i in range(2):
            response = self.client.post(
                self.register_url,
                {
                    "email": f"reg{i}@example.com",
                    "password": self.PASSWORD,
                },
                format="json",
            )
            self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        blocked = self.client.post(
            self.register_url,
            {"email": "reg-blocked@example.com", "password": self.PASSWORD},
            format="json",
        )
        self.assertEqual(blocked.status_code, status.HTTP_429_TOO_MANY_REQUESTS)

    def test_resend_throttled_per_email(self):
        User.objects.create_user(
            email="pending@example.com",
            password=self.PASSWORD,
            is_active=False,
        )

        for _ in range(2):
            response = self.client.post(
                self.resend_url,
                {"email": "pending@example.com"},
                format="json",
            )
            self.assertEqual(response.status_code, status.HTTP_200_OK)

        blocked = self.client.post(
            self.resend_url,
            {"email": "pending@example.com"},
            format="json",
        )
        self.assertEqual(blocked.status_code, status.HTTP_429_TOO_MANY_REQUESTS)
