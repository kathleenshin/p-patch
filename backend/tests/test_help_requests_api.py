"""
Help-request (task) API tests (SQLite via config.settings_test).

Covers create/list/assign-by-email-or-name and pending vs approved gates.
"""

from django.conf import settings
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken

from help_requests.models import HelpRequest
from plots.models import Garden, Plot
from users.models import User


class HelpRequestApiTests(APITestCase):
    PASSWORD = "password1"

    @classmethod
    def setUpClass(cls):
        engine = settings.DATABASES["default"]["ENGINE"]
        if "sqlite3" not in engine:
            raise RuntimeError(
                "Help-request API tests must run on SQLite, not Neon. "
                "Use: python manage.py test tests.test_help_requests_api"
            )
        super().setUpClass()

    @classmethod
    def setUpTestData(cls):
        cls.garden = Garden.objects.create(name="Judkins Park")
        cls.plot = Plot.objects.create(
            garden=cls.garden, plot_number="12", is_active=True
        )
        cls.other_garden = Garden.objects.create(name="Other Garden")
        cls.other_plot = Plot.objects.create(
            garden=cls.other_garden, plot_number="99", is_active=True
        )

        cls.pending = User.objects.create_user(
            email="pending@example.com",
            password=cls.PASSWORD,
            is_approved=False,
        )
        cls.creator = User.objects.create_user(
            email="creator@example.com",
            password=cls.PASSWORD,
            first_name="Casey",
            last_name="Creator",
            is_approved=True,
        )
        cls.assignee = User.objects.create_user(
            email="assignee@example.com",
            password=cls.PASSWORD,
            first_name="Alex",
            last_name="Assignee",
            is_approved=True,
        )
        cls.admin = User.objects.create_user(
            email="admin@example.com",
            password=cls.PASSWORD,
            first_name="Avery",
            last_name="Admin",
            is_approved=True,
            is_garden_admin=True,
        )

        cls.list_url = reverse("help-request-list-create")

    def authenticate_as(self, user):
        access_token = str(RefreshToken.for_user(user).access_token)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {access_token}")

    def detail_url(self, pk):
        return reverse("help-request-detail", kwargs={"pk": pk})

    def assign_url(self, pk):
        return reverse("help-request-assign", kwargs={"pk": pk})

    def test_unauthenticated_returns_401(self):
        response = self.client.get(self.list_url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_pending_cannot_create_or_list_tasks(self):
        self.authenticate_as(self.pending)

        listing = self.client.get(self.list_url)
        self.assertEqual(listing.status_code, status.HTTP_403_FORBIDDEN)

        create = self.client.post(
            self.list_url,
            {
                "title": "Weed beds",
                "description": "North zone",
                "garden": self.garden.pk,
            },
            format="json",
        )
        self.assertEqual(create.status_code, status.HTTP_403_FORBIDDEN)

    def test_approved_member_can_create_and_list_task(self):
        self.authenticate_as(self.creator)

        create = self.client.post(
            self.list_url,
            {
                "title": "Fix drip line",
                "description": "Plot 12 valve leak",
                "garden": self.garden.pk,
                "plot": self.plot.pk,
                "priority": "high",
                "category": "maintenance",
            },
            format="json",
        )
        self.assertEqual(create.status_code, status.HTTP_201_CREATED)
        self.assertEqual(create.data["title"], "Fix drip line")
        self.assertEqual(create.data["created_by"], self.creator.pk)
        self.assertIsNone(create.data["assigned_to"])

        listing = self.client.get(self.list_url)
        self.assertEqual(listing.status_code, status.HTTP_200_OK)
        self.assertEqual(len(listing.data), 1)

    def test_create_with_assignee_email(self):
        self.authenticate_as(self.creator)

        response = self.client.post(
            self.list_url,
            {
                "title": "Compost turn",
                "description": "Weekend bins",
                "garden": self.garden.pk,
                "assignee": self.assignee.email,
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["assigned_to"], self.assignee.pk)
        self.assertEqual(response.data["assigned_to_email"], self.assignee.email)

    def test_assign_by_full_name(self):
        self.authenticate_as(self.creator)
        task = HelpRequest.objects.create(
            title="Watering help",
            description="Greenhouse",
            garden=self.garden,
            created_by=self.creator,
        )

        response = self.client.post(
            self.assign_url(task.pk),
            {"assignee": "Alex Assignee"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["assigned_to"], self.assignee.pk)
        task.refresh_from_db()
        self.assertEqual(task.assigned_to_id, self.assignee.pk)

    def test_assign_unknown_person_returns_400(self):
        self.authenticate_as(self.creator)
        task = HelpRequest.objects.create(
            title="Mystery task",
            description="No match",
            garden=self.garden,
            created_by=self.creator,
        )

        response = self.client.post(
            self.assign_url(task.pk),
            {"assignee": "Nobody Here"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("assignee", response.data)

    def test_plot_must_belong_to_garden(self):
        self.authenticate_as(self.creator)

        response = self.client.post(
            self.list_url,
            {
                "title": "Bad plot link",
                "description": "Mismatch",
                "garden": self.garden.pk,
                "plot": self.other_plot.pk,
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("plot", response.data)

    def test_patch_status_sets_completed_at(self):
        self.authenticate_as(self.creator)
        task = HelpRequest.objects.create(
            title="Done soon",
            description="Mark complete",
            garden=self.garden,
            created_by=self.creator,
            status=HelpRequest.Status.ACTIVE,
        )

        response = self.client.patch(
            self.detail_url(task.pk),
            {"status": HelpRequest.Status.DONE},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["status"], HelpRequest.Status.DONE)
        self.assertIsNotNone(response.data["completed_at"])

    def test_filter_by_status(self):
        self.authenticate_as(self.creator)
        HelpRequest.objects.create(
            title="Active task",
            description="a",
            garden=self.garden,
            created_by=self.creator,
            status=HelpRequest.Status.ACTIVE,
        )
        HelpRequest.objects.create(
            title="Done task",
            description="b",
            garden=self.garden,
            created_by=self.creator,
            status=HelpRequest.Status.DONE,
        )

        response = self.client.get(f"{self.list_url}?status=done")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["title"], "Done task")

    def test_garden_admin_can_create_task(self):
        self.authenticate_as(self.admin)

        response = self.client.post(
            self.list_url,
            {
                "title": "Admin task",
                "description": "Oversight",
                "garden": self.garden.pk,
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
