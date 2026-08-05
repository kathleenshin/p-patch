"""
Plot and plot-note API tests (SQLite via config.settings_test).

Covers pending-safe owner omission, note ownership, and auth gates.
"""

from django.conf import settings
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken

from plots.models import Garden, Plot, PlotNote, PlotOwnership
from users.models import User


class PlotApiTests(APITestCase):
    PASSWORD = "password1"

    @classmethod
    def setUpClass(cls):
        engine = settings.DATABASES["default"]["ENGINE"]
        if "sqlite3" not in engine:
            raise RuntimeError(
                "Plot API tests must run on SQLite, not Neon. "
                "Use: python manage.py test tests.test_plots_api"
            )
        super().setUpClass()

    @classmethod
    def setUpTestData(cls):
        cls.garden = Garden.objects.create(name="Judkins Park")
        cls.plot_a = Plot.objects.create(
            garden=cls.garden, plot_number="A1", is_active=True
        )
        cls.plot_b = Plot.objects.create(
            garden=cls.garden, plot_number="B2", is_active=True
        )

        cls.pending = User.objects.create_user(
            email="pending@example.com",
            password=cls.PASSWORD,
            first_name="Pat",
            last_name="Pending",
            is_approved=False,
        )
        cls.owner = User.objects.create_user(
            email="owner@example.com",
            password=cls.PASSWORD,
            first_name="Olivia",
            last_name="Owner",
            is_approved=True,
        )
        cls.member = User.objects.create_user(
            email="member@example.com",
            password=cls.PASSWORD,
            first_name="Morgan",
            last_name="Member",
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

        # Owner actively stewards plot A only.
        PlotOwnership.objects.create(
            plot=cls.plot_a,
            user=cls.owner,
            is_primary=True,
        )

        cls.list_url = reverse("plot-list")
        cls.detail_url = reverse("plot-detail", kwargs={"pk": cls.plot_a.pk})
        cls.notes_url = reverse(
            "plot-note-list-create", kwargs={"plot_id": cls.plot_a.pk}
        )
        cls.notes_other_url = reverse(
            "plot-note-list-create", kwargs={"plot_id": cls.plot_b.pk}
        )

    def authenticate_as(self, user):
        access_token = str(RefreshToken.for_user(user).access_token)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {access_token}")

    def test_unauthenticated_plot_list_returns_401(self):
        response = self.client.get(self.list_url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_pending_can_list_plots_without_owner_names(self):
        self.authenticate_as(self.pending)

        response = self.client.get(self.list_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(len(response.data), 1)
        for plot in response.data:
            self.assertEqual(plot["owners"], [])

    def test_pending_cannot_create_note(self):
        self.authenticate_as(self.pending)

        response = self.client.post(
            self.notes_url,
            {"content": "Hello from pending", "visibility": "garden_members"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_approved_owner_can_create_and_list_note(self):
        self.authenticate_as(self.owner)

        create = self.client.post(
            self.notes_url,
            {"content": "Watered beds", "visibility": "this_plot"},
            format="json",
        )
        self.assertEqual(create.status_code, status.HTTP_201_CREATED)
        self.assertEqual(create.data["content"], "Watered beds")
        self.assertEqual(create.data["author"], self.owner.pk)

        listing = self.client.get(self.notes_url)
        self.assertEqual(listing.status_code, status.HTTP_200_OK)
        self.assertEqual(len(listing.data), 1)
        self.assertEqual(listing.data[0]["content"], "Watered beds")

    def test_approved_non_owner_cannot_create_note(self):
        self.authenticate_as(self.member)

        response = self.client.post(
            self.notes_url,
            {"content": "Not my plot", "visibility": "garden_members"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(PlotNote.objects.count(), 0)

    def test_approved_member_sees_owner_names_on_detail(self):
        self.authenticate_as(self.member)

        response = self.client.get(self.detail_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["owners"]), 1)
        self.assertEqual(response.data["owners"][0]["email"], self.owner.email)

    def test_garden_admin_can_create_note_on_any_plot(self):
        self.authenticate_as(self.admin)

        response = self.client.post(
            self.notes_other_url,
            {"content": "Admin walkthrough", "visibility": "garden_members"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["content"], "Admin walkthrough")

    def test_non_owner_cannot_see_this_plot_visibility_notes(self):
        PlotNote.objects.create(
            plot=self.plot_a,
            author=self.owner,
            content="Private to owners",
            visibility="this_plot",
        )
        PlotNote.objects.create(
            plot=self.plot_a,
            author=self.owner,
            content="Shared with garden",
            visibility="garden_members",
        )
        self.authenticate_as(self.member)

        response = self.client.get(self.notes_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        contents = [note["content"] for note in response.data]
        self.assertIn("Shared with garden", contents)
        self.assertNotIn("Private to owners", contents)
