"""
Admin approval API tests (pending list / approve / reject).

Expects config.settings_test (in-memory SQLite) via `manage.py test`.
Run: python manage.py test tests.test_admin_approval

Note: We removed HTTP 403 on *login* for pending users so they can enter a
limited session. That does not apply here — garden-admin-only endpoints still
correctly return 403 when a non-admin calls them.
"""

from django.conf import settings
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken

from users.models import User


class AdminApprovalApiTests(APITestCase):
    PENDING_EMAIL = "pending@example.com"
    MEMBER_EMAIL = "member@example.com"
    ADMIN_EMAIL = "garden-admin@example.com"
    PASSWORD = "password1"

    @classmethod
    def setUpClass(cls):
        engine = settings.DATABASES["default"]["ENGINE"]
        if "sqlite3" not in engine:
            raise RuntimeError(
                "Admin approval tests must run on SQLite, not Neon. "
                "Use: python manage.py test tests.test_admin_approval"
            )
        super().setUpClass()

    @classmethod
    def setUpTestData(cls):
        cls.pending_url = reverse("auth-pending")

    def create_user(self, email, **extra_fields):
        return User.objects.create_user(
            email=email,
            password=self.PASSWORD,
            **extra_fields,
        )

    def authenticate_as(self, user):
        access_token = str(RefreshToken.for_user(user).access_token)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {access_token}")

    def approve_url(self, user_id):
        return reverse("auth-approve", kwargs={"user_id": user_id})

    def reject_url(self, user_id):
        return reverse("auth-reject", kwargs={"user_id": user_id})

    def test_pending_list_as_non_admin_returns_403(self):
        """Approved members cannot list pending users."""
        member = self.create_user(
            email=self.MEMBER_EMAIL,
            is_approved=True,
            is_garden_admin=False,
        )
        self.authenticate_as(member)

        response = self.client.get(self.pending_url)

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_pending_list_as_staff_without_garden_admin_returns_403(self):
        """Django staff alone is not an app garden admin."""
        staff = self.create_user(
            email="staff@example.com",
            is_approved=True,
            is_staff=True,
            is_garden_admin=False,
        )
        self.authenticate_as(staff)

        response = self.client.get(self.pending_url)

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_pending_list_as_garden_admin_returns_unapproved_users(self):
        """Admin sees only is_approved=False users."""
        pending = self.create_user(
            email=self.PENDING_EMAIL,
            is_approved=False,
            first_name="Pat",
            last_name="Pending",
        )
        self.create_user(
            email=self.MEMBER_EMAIL,
            is_approved=True,
            is_garden_admin=False,
        )
        admin = self.create_user(
            email=self.ADMIN_EMAIL,
            is_approved=True,
            is_garden_admin=True,
        )
        self.authenticate_as(admin)

        response = self.client.get(self.pending_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        emails = [row["email"] for row in response.data]
        self.assertIn(pending.email, emails)
        self.assertNotIn(self.MEMBER_EMAIL, emails)
        self.assertNotIn(self.ADMIN_EMAIL, emails)

    def test_approve_sets_is_approved_true(self):
        """Approve flips the flag so the member unlocks full app access."""
        pending = self.create_user(
            email=self.PENDING_EMAIL,
            is_approved=False,
        )
        admin = self.create_user(
            email=self.ADMIN_EMAIL,
            is_approved=True,
            is_garden_admin=True,
        )
        self.authenticate_as(admin)

        response = self.client.post(self.approve_url(pending.id), format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["is_approved"])
        pending.refresh_from_db()
        self.assertTrue(pending.is_approved)

    def test_reject_deletes_unapproved_user(self):
        """Reject removes the pending signup from the database."""
        pending = self.create_user(
            email=self.PENDING_EMAIL,
            is_approved=False,
        )
        pending_id = pending.id
        admin = self.create_user(
            email=self.ADMIN_EMAIL,
            is_approved=True,
            is_garden_admin=True,
        )
        self.authenticate_as(admin)

        response = self.client.post(self.reject_url(pending_id), format="json")

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(User.objects.filter(pk=pending_id).exists())

    def test_approved_member_cannot_approve(self):
        """Non-admins get 403 and the pending user stays unapproved."""
        pending = self.create_user(
            email=self.PENDING_EMAIL,
            is_approved=False,
        )
        member = self.create_user(
            email=self.MEMBER_EMAIL,
            is_approved=True,
            is_garden_admin=False,
        )
        self.authenticate_as(member)

        response = self.client.post(self.approve_url(pending.id), format="json")

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        pending.refresh_from_db()
        self.assertFalse(pending.is_approved)

    def test_setting_garden_admin_also_approves_user(self):
        """Saving with is_garden_admin=True forces is_approved=True."""
        user = self.create_user(
            email="coord@example.com",
            is_approved=False,
            is_garden_admin=False,
        )
        user.is_garden_admin = True
        user.save()

        user.refresh_from_db()
        self.assertTrue(user.is_garden_admin)
        self.assertTrue(user.is_approved)
