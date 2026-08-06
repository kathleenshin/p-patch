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

from users.models import User


class AuthApiTests(APITestCase):
    USER_EMAIL = "ada@example.com"
    ADMIN_EMAIL = "admin@example.com"
    PASSWORD = "password1"
    WRONG_PASSWORD = "wrong-password"
    SHORT_PASSWORD = "short"
    FULL_NAME = "Ada Lovelace"
    FIRST_NAME = "Ada"
    LAST_NAME = "Lovelace"
    INVALID_REFRESH_TOKEN = "not-a-valid-token"

    @classmethod
    def setUpClass(cls):
        engine = settings.DATABASES["default"]["ENGINE"]
        if "sqlite3" not in engine:
            raise RuntimeError(
                "Auth API tests must run on SQLite, not Neon. "
                "Use: python manage.py test tests.test_auth_api"
            )
        super().setUpClass()

    @classmethod
    def setUpTestData(cls):
        cls.register_url = reverse("auth-register")
        cls.login_url = reverse("auth-login")
        cls.refresh_url = reverse("auth-refresh")
        cls.me_url = reverse("auth-me")

    def create_user(self, email=USER_EMAIL, password=PASSWORD, **extra_fields):
        return User.objects.create_user(
            email=email,
            password=password,
            **extra_fields,
        )

    def post_register(self, **payload_overrides):
        payload = {
            "email": self.USER_EMAIL,
            "password": self.PASSWORD,
            **payload_overrides,
        }
        return self.client.post(self.register_url, payload, format="json")

    def post_login(self, email=USER_EMAIL, password=PASSWORD):
        return self.client.post(
            self.login_url,
            {"email": email, "password": password},
            format="json",
        )

    def post_refresh(self, refresh_token):
        return self.client.post(
            self.refresh_url,
            {"refresh": refresh_token},
            format="json",
        )

    def authenticate_as(self, user):
        access_token = str(RefreshToken.for_user(user).access_token)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {access_token}")

    def assert_token_pair_returned(self, response):
        self.assertIn("access", response.data)
        self.assertIn("refresh", response.data)

    def test_register_creates_inactive_user_without_tokens(self):
        response = self.post_register(full_name=self.FULL_NAME)

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertNotIn("access", response.data)
        self.assertNotIn("refresh", response.data)
        self.assertEqual(response.data["email"], self.USER_EMAIL)

        user = User.objects.get(email=self.USER_EMAIL)
        self.assertEqual(user.username, self.USER_EMAIL)
        self.assertEqual(user.first_name, self.FIRST_NAME)
        self.assertEqual(user.last_name, self.LAST_NAME)
        self.assertFalse(user.is_approved)
        self.assertFalse(user.is_active)

    def test_register_duplicate_email_returns_400(self):
        self.create_user(is_approved=True)

        response = self.post_register()

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_register_short_password_returns_400(self):
        response = self.post_register(password=self.SHORT_PASSWORD)

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_login_approved_user_returns_tokens(self):
        self.create_user(is_approved=True)

        response = self.post_login()

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assert_token_pair_returned(response)
        self.assertEqual(response.data["user"]["email"], self.USER_EMAIL)

    def test_login_bad_password_returns_401(self):
        self.create_user(is_approved=True)

        response = self.post_login(password=self.WRONG_PASSWORD)

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_login_unapproved_user_returns_tokens(self):
        self.create_user(is_approved=False)

        response = self.post_login()

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assert_token_pair_returned(response)
        self.assertEqual(response.data["user"]["email"], self.USER_EMAIL)
        self.assertFalse(response.data["user"]["is_approved"])

    def test_me_with_valid_token_returns_user(self):
        user = self.create_user(
            is_approved=True,
            first_name=self.FIRST_NAME,
        )
        self.authenticate_as(user)

        response = self.client.get(self.me_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["email"], self.USER_EMAIL)
        self.assertEqual(response.data["first_name"], self.FIRST_NAME)

    def test_me_without_token_returns_401(self):
        response = self.client.get(self.me_url)

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_refresh_with_valid_token_returns_access(self):
        user = self.create_user(is_approved=True)
        refresh_token = str(RefreshToken.for_user(user))

        response = self.post_refresh(refresh_token)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("access", response.data)

    def test_refresh_with_invalid_token_returns_401(self):
        response = self.post_refresh(self.INVALID_REFRESH_TOKEN)

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
