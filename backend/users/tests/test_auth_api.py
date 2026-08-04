"""
Auth API tests expect config.settings_test (in-memory SQLite).

`manage.py test` loads that settings module automatically so Neon is never
touched. Existing migrations apply only to the temporary SQLite DB.
"""

from django.conf import settings
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken

from ..models import User


class AuthApiTests(APITestCase):
    @classmethod
    def setUpClass(cls):
        engine = settings.DATABASES["default"]["ENGINE"]
        if "sqlite3" not in engine:
            raise RuntimeError(
                "Auth API tests must run on SQLite, not Neon. "
                "Use: python manage.py test users.tests.test_auth_api"
            )
        super().setUpClass()

    def setUp(self):
        self.register_url = reverse("auth-register")
        self.login_url = reverse("auth-login")
        self.refresh_url = reverse("auth-refresh")
        self.me_url = reverse("auth-me")

    def test_register_creates_user_and_returns_tokens(self):
        response = self.client.post(
            self.register_url,
            {
                "email": "ada@example.com",
                "password": "password1",
                "full_name": "Ada Lovelace",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn("access", response.data)
        self.assertIn("refresh", response.data)
        self.assertEqual(response.data["user"]["email"], "ada@example.com")
        self.assertFalse(response.data["user"]["is_approved"])

        user = User.objects.get(email="ada@example.com")
        self.assertEqual(user.username, "ada@example.com")
        self.assertEqual(user.first_name, "Ada")
        self.assertEqual(user.last_name, "Lovelace")
        self.assertFalse(user.is_approved)

    def test_register_duplicate_email_returns_400(self):
        User.objects.create_user(
            email="ada@example.com",
            password="password1",
            is_approved=True,
        )

        response = self.client.post(
            self.register_url,
            {
                "email": "ada@example.com",
                "password": "password1",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_register_short_password_returns_400(self):
        response = self.client.post(
            self.register_url,
            {
                "email": "ada@example.com",
                "password": "short",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_login_approved_user_returns_tokens(self):
        User.objects.create_user(
            email="ada@example.com",
            password="password1",
            is_approved=True,
        )

        response = self.client.post(
            self.login_url,
            {"email": "ada@example.com", "password": "password1"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("access", response.data)
        self.assertIn("refresh", response.data)
        self.assertEqual(response.data["user"]["email"], "ada@example.com")

    def test_login_bad_password_returns_401(self):
        User.objects.create_user(
            email="ada@example.com",
            password="password1",
            is_approved=True,
        )

        response = self.client.post(
            self.login_url,
            {"email": "ada@example.com", "password": "wrong-password"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_login_unapproved_user_returns_tokens(self):
        User.objects.create_user(
            email="ada@example.com",
            password="password1",
            is_approved=False,
        )
        response = self.client.post(
            self.login_url,
            {"email": "ada@example.com", "password": "password1"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("access", response.data)
        self.assertIn("refresh", response.data)
        self.assertEqual(response.data["user"]["email"], "ada@example.com")
        self.assertFalse(response.data["user"]["is_approved"])

    def test_me_with_valid_token_returns_user(self):
        user = User.objects.create_user(
            email="ada@example.com",
            password="password1",
            is_approved=True,
            first_name="Ada",
        )
        access = str(RefreshToken.for_user(user).access_token)

        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {access}")
        response = self.client.get(self.me_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["email"], "ada@example.com")
        self.assertEqual(response.data["first_name"], "Ada")

    def test_me_without_token_returns_401(self):
        response = self.client.get(self.me_url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_refresh_with_valid_token_returns_access(self):
        user = User.objects.create_user(
            email="ada@example.com",
            password="password1",
            is_approved=True,
        )
        refresh = str(RefreshToken.for_user(user))

        response = self.client.post(
            self.refresh_url,
            {"refresh": refresh},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("access", response.data)

    def test_refresh_with_invalid_token_returns_401(self):
        response = self.client.post(
            self.refresh_url,
            {"refresh": "not-a-valid-token"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
