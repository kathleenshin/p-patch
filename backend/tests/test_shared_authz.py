"""
Shared authz foundation tests (IsApproved helpers + locked user list).

Run: python manage.py test tests.test_shared_authz
"""

from django.conf import settings
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIRequestFactory, APITestCase, force_authenticate
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from users.models import User
from users.permissions import IsApproved, IsApprovedReadOrGardenAdminWrite


class _ApprovedOnlyView(APIView):
    # Minimal stand-in for member APIs that opt into IsApproved.
    permission_classes = [IsApproved]

    def get(self, request):
        from rest_framework.response import Response

        return Response({"ok": True})


class _ReadWriteSplitView(APIView):
    # Stand-in for IsApprovedReadOrGardenAdminWrite (plots-style).
    permission_classes = [IsApprovedReadOrGardenAdminWrite]

    def get(self, request):
        from rest_framework.response import Response

        return Response({"ok": True})

    def post(self, request):
        from rest_framework.response import Response

        return Response({"ok": True}, status=status.HTTP_201_CREATED)


class SharedAuthzTests(APITestCase):
    PASSWORD = "password1"

    @classmethod
    def setUpClass(cls):
        engine = settings.DATABASES["default"]["ENGINE"]
        if "sqlite3" not in engine:
            raise RuntimeError(
                "Shared authz tests must run on SQLite, not Neon. "
                "Use: python manage.py test tests.test_shared_authz"
            )
        super().setUpClass()

    def create_user(self, email, **extra_fields):
        return User.objects.create_user(
            email=email,
            password=self.PASSWORD,
            **extra_fields,
        )

    def authenticate_as(self, user):
        access = str(RefreshToken.for_user(user).access_token)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {access}")

    def test_is_approved_rejects_anonymous_and_pending(self):
        factory = APIRequestFactory()
        view = _ApprovedOnlyView.as_view()

        anon_response = view(factory.get("/"))
        self.assertEqual(anon_response.status_code, status.HTTP_401_UNAUTHORIZED)

        pending = self.create_user(email="pending@example.com", is_approved=False)
        pending_request = factory.get("/")
        force_authenticate(pending_request, user=pending)
        pending_response = view(pending_request)
        self.assertEqual(pending_response.status_code, status.HTTP_403_FORBIDDEN)

        member = self.create_user(email="member@example.com", is_approved=True)
        member_request = factory.get("/")
        force_authenticate(member_request, user=member)
        member_response = view(member_request)
        self.assertEqual(member_response.status_code, status.HTTP_200_OK)

    def test_read_write_split_allows_member_read_admin_write(self):
        factory = APIRequestFactory()
        view = _ReadWriteSplitView.as_view()

        member = self.create_user(email="reader@example.com", is_approved=True)
        get_request = factory.get("/")
        force_authenticate(get_request, user=member)
        self.assertEqual(view(get_request).status_code, status.HTTP_200_OK)

        post_as_member = factory.post("/", {}, format="json")
        force_authenticate(post_as_member, user=member)
        self.assertEqual(
            view(post_as_member).status_code,
            status.HTTP_403_FORBIDDEN,
        )

        admin = self.create_user(
            email="admin@example.com",
            is_garden_admin=True,
        )
        post_as_admin = factory.post("/", {}, format="json")
        force_authenticate(post_as_admin, user=admin)
        self.assertEqual(
            view(post_as_admin).status_code,
            status.HTTP_201_CREATED,
        )

    def test_users_list_requires_garden_admin(self):
        url = reverse("auth-users")

        # Anonymous
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

        # Approved member, not garden admin
        member = self.create_user(
            email="member-list@example.com",
            is_approved=True,
            is_garden_admin=False,
        )
        self.authenticate_as(member)
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

        # Garden admin
        admin = self.create_user(
            email="admin-list@example.com",
            is_garden_admin=True,
        )
        self.authenticate_as(admin)
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_me_allows_pending_user(self):
        # /me stays IsAuthenticated so pending clients can read their flags.
        pending = self.create_user(email="me-pending@example.com", is_approved=False)
        self.authenticate_as(pending)

        response = self.client.get(reverse("auth-me"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(response.data["is_approved"])
