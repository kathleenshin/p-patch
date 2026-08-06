"""
Email confirmation flow tests (register → confirm → login).

Expects config.settings_test (in-memory SQLite) via `manage.py test`.
Run: python manage.py test tests.test_email_confirmation
"""

from django.conf import settings
from django.core import mail
from django.test import override_settings
from django.urls import reverse
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode
from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken

from users.email_confirmation import build_confirmation_link
from users.models import User
from users.tokens import email_confirmation_token


class EmailConfirmationApiTests(APITestCase):
    USER_EMAIL = "ada@example.com"
    PASSWORD = "password1"
    FULL_NAME = "Ada Lovelace"

    @classmethod
    def setUpClass(cls):
        engine = settings.DATABASES["default"]["ENGINE"]
        if "sqlite3" not in engine:
            raise RuntimeError(
                "Email confirmation tests must run on SQLite, not Neon. "
                "Use: python manage.py test tests.test_email_confirmation"
            )
        super().setUpClass()

    @classmethod
    def setUpTestData(cls):
        cls.register_url = reverse("auth-register")
        cls.login_url = reverse("auth-login")
        cls.confirm_url = reverse("auth-confirm-email")
        cls.resend_url = reverse("auth-resend-confirmation")
        cls.pending_url = reverse("auth-pending")

    def post_register(self, **overrides):
        payload = {
            "email": self.USER_EMAIL,
            "password": self.PASSWORD,
            "full_name": self.FULL_NAME,
            **overrides,
        }
        return self.client.post(self.register_url, payload, format="json")

    def post_login(self, email=None, password=None):
        return self.client.post(
            self.login_url,
            {
                "email": email or self.USER_EMAIL,
                "password": password or self.PASSWORD,
            },
            format="json",
        )

    def confirmation_payload_for(self, user):
        return {
            "uid": urlsafe_base64_encode(force_bytes(user.pk)),
            "token": email_confirmation_token.make_token(user),
        }

    def test_register_creates_inactive_user_and_sends_email(self):
        response = self.post_register()

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertNotIn("access", response.data)
        self.assertEqual(response.data["email"], self.USER_EMAIL)

        user = User.objects.get(email=self.USER_EMAIL)
        self.assertFalse(user.is_active)
        self.assertFalse(user.is_approved)
        self.assertEqual(len(mail.outbox), 1)
        self.assertIn(self.USER_EMAIL, mail.outbox[0].to)
        self.assertIn("confirm_email=1", mail.outbox[0].body)
        self.assertIn("uid=", mail.outbox[0].body)
        self.assertIn("token=", mail.outbox[0].body)

    @override_settings(FRONTEND_URL="http://localhost:5173")
    def test_confirmation_email_uses_frontend_url(self):
        self.post_register()

        self.assertEqual(len(mail.outbox), 1)
        self.assertIn("http://localhost:5173/?confirm_email=1&", mail.outbox[0].body)
        user = User.objects.get(email=self.USER_EMAIL)
        self.assertIn(build_confirmation_link(user).split("&token=")[0], mail.outbox[0].body)

    def test_login_before_confirm_returns_403(self):
        self.post_register()

        response = self.post_login()

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn("confirm your email", response.data["detail"])

    def test_login_inactive_with_wrong_password_returns_401(self):
        self.post_register()

        response = self.post_login(password="wrong-password")

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(response.data["detail"], "Invalid email or password.")

    def test_confirm_email_activates_user_and_returns_tokens(self):
        self.post_register()
        user = User.objects.get(email=self.USER_EMAIL)

        response = self.client.post(
            self.confirm_url,
            self.confirmation_payload_for(user),
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("access", response.data)
        self.assertIn("refresh", response.data)
        self.assertEqual(response.data["user"]["email"], self.USER_EMAIL)
        self.assertFalse(response.data["user"]["is_approved"])
        user.refresh_from_db()
        self.assertTrue(user.is_active)
        self.assertFalse(user.is_approved)

    def test_full_flow_register_confirm_login(self):
        self.post_register()
        user = User.objects.get(email=self.USER_EMAIL)

        confirm = self.client.post(
            self.confirm_url,
            self.confirmation_payload_for(user),
            format="json",
        )
        self.assertEqual(confirm.status_code, status.HTTP_200_OK)

        login = self.post_login()
        self.assertEqual(login.status_code, status.HTTP_200_OK)
        self.assertIn("access", login.data)
        self.assertFalse(login.data["user"]["is_approved"])

    def test_confirm_email_invalid_token_returns_400(self):
        self.post_register()
        user = User.objects.get(email=self.USER_EMAIL)
        payload = self.confirmation_payload_for(user)
        payload["token"] = "not-a-real-token"

        response = self.client.post(self.confirm_url, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Invalid or expired", response.data["detail"])
        user.refresh_from_db()
        self.assertFalse(user.is_active)

    def test_confirm_email_invalid_uid_returns_400(self):
        response = self.client.post(
            self.confirm_url,
            {"uid": "not-valid-uid", "token": "whatever"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Invalid confirmation link", response.data["detail"])

    def test_confirm_email_already_active_returns_tokens(self):
        self.post_register()
        user = User.objects.get(email=self.USER_EMAIL)
        payload = self.confirmation_payload_for(user)

        first = self.client.post(self.confirm_url, payload, format="json")
        self.assertEqual(first.status_code, status.HTTP_200_OK)

        # Second click with the old token: user already active → still succeed.
        second = self.client.post(self.confirm_url, payload, format="json")
        self.assertEqual(second.status_code, status.HTTP_200_OK)
        self.assertIn("access", second.data)

    def test_resend_confirmation_sends_another_email(self):
        self.post_register()
        mail.outbox.clear()

        response = self.client.post(
            self.resend_url,
            {"email": self.USER_EMAIL},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(mail.outbox), 1)
        self.assertIn("confirm_email=1", mail.outbox[0].body)

    def test_resend_unknown_email_returns_generic_ok_without_mail(self):
        response = self.client.post(
            self.resend_url,
            {"email": "nobody@example.com"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("If an unconfirmed account exists", response.data["detail"])
        self.assertEqual(len(mail.outbox), 0)

    def test_resend_already_active_returns_generic_ok_without_mail(self):
        User.objects.create_user(
            email=self.USER_EMAIL,
            password=self.PASSWORD,
            is_active=True,
        )

        response = self.client.post(
            self.resend_url,
            {"email": self.USER_EMAIL},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(mail.outbox), 0)

    def test_reregister_unconfirmed_email_resends_confirmation(self):
        self.post_register()
        mail.outbox.clear()

        response = self.post_register(password="password2")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(User.objects.filter(email=self.USER_EMAIL).count(), 1)
        user = User.objects.get(email=self.USER_EMAIL)
        self.assertFalse(user.is_active)
        self.assertTrue(user.check_password("password2"))
        self.assertEqual(len(mail.outbox), 1)

    def test_register_active_duplicate_email_returns_400(self):
        User.objects.create_user(
            email=self.USER_EMAIL,
            password=self.PASSWORD,
            is_active=True,
        )

        response = self.post_register()

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("email", response.data)

    def test_unconfirmed_user_not_in_pending_list(self):
        self.post_register()
        admin = User.objects.create_user(
            email="garden-admin@example.com",
            password=self.PASSWORD,
            is_approved=True,
            is_garden_admin=True,
        )
        access = str(RefreshToken.for_user(admin).access_token)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {access}")

        response = self.client.get(self.pending_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        emails = [row["email"] for row in response.data]
        self.assertNotIn(self.USER_EMAIL, emails)

    def test_confirmed_unapproved_user_appears_in_pending_list(self):
        self.post_register()
        user = User.objects.get(email=self.USER_EMAIL)
        self.client.post(
            self.confirm_url,
            self.confirmation_payload_for(user),
            format="json",
        )

        admin = User.objects.create_user(
            email="garden-admin@example.com",
            password=self.PASSWORD,
            is_approved=True,
            is_garden_admin=True,
        )
        access = str(RefreshToken.for_user(admin).access_token)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {access}")

        response = self.client.get(self.pending_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        emails = [row["email"] for row in response.data]
        self.assertIn(self.USER_EMAIL, emails)
