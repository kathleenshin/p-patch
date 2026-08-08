import datetime

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient

from plots.models import Garden, GardenMembership, Plot, PlotNote, PlotOwnership


User = get_user_model()


class BasePlotTestCase(TestCase):
    # Shared fixtures for the plots app tests.

    @classmethod
    def setUpTestData(cls):
        super().setUpTestData()

        cls.d1 = datetime.date(2026, 1, 1)
        cls.d2 = datetime.date(2026, 2, 1)
        cls.d3 = datetime.date(2026, 3, 1)
        cls.d4 = datetime.date(2026, 4, 1)

        cls.user_one = User.objects.create_user(
            email="testuser@example.com",
            password="password",
        )

        cls.user_two = User.objects.create_user(
            email="coowner@example.com",
            password="password",
        )

        cls.user_three = User.objects.create_user(
            email="thirduser@example.com",
            password="password",
        )

        cls.outsider_user = User.objects.create_user(
            email="outsider@example.com",
            password="password",
        )

        cls.garden = Garden.objects.create(
            name="Judkins Park P-Patch",
        )

        cls.other_garden = Garden.objects.create(
            name="Ballard P-Patch",
        )

        cls.plot = Plot.objects.create(
            garden=cls.garden,
            plot_number="1",
        )


class BasePlotAPITestCase(BasePlotTestCase):
    @classmethod
    def setUpTestData(cls):
        super().setUpTestData()

        # Plot API fixtures
        cls.plot_list_create_url = reverse("plot-list-create")
        cls.plot_detail_url = reverse(
            "plot-detail",
            kwargs={"pk": cls.plot.pk},
        )
        cls.unknown_plot_detail_url = reverse(
            "plot-detail",
            kwargs={"pk": 999999},
        )

        # PlotNote API fixtures
        cls.note = PlotNote.objects.create(
            plot=cls.plot,
            author=cls.user_one,
            content="Tomatoes were watered.",
            visibility="this_plot",
        )

        cls.plot_note_list_create_url = reverse(
            "plot-note-list-create"
        )

        cls.plot_note_detail_url = reverse(
            "plot-note-detail",
            kwargs={"pk": cls.note.pk},
        )

        cls.unknown_plot_note_detail_url = reverse(
            "plot-note-detail",
            kwargs={"pk": 999999},
        )

    def setUp(self):
        self.client = APIClient()
        self.client.force_authenticate(user=self.user_one)

        # Plot API payloads
        self.create_plot_payload = {
            "garden": self.garden.id,
            "plot_number": "2",
            "is_active": True,
        }

        self.duplicate_plot_payload = {
            "garden": self.garden.id,
            "plot_number": "1",
            "is_active": True,
        }

        self.other_garden_plot_payload = {
            "garden": self.other_garden.id,
            "plot_number": "1",
            "is_active": True,
        }

        # PlotNote API payloads
        self.create_plot_note_payload = {
            "plot": self.plot.id,
            "content": "The beans need support.",
            "visibility": "garden_members",
        }

        self.invalid_visibility_payload = {
            "plot": self.plot.id,
            "content": "Invalid visibility test.",
            "visibility": "not_a_real_choice",
        }

    def create_plot(self, plot_number, garden=None, is_active=True):
        """Create a plot in tests with sensible defaults."""

        return Plot.objects.create(
            garden=garden or self.garden,
            plot_number=plot_number,
            is_active=is_active,
        )

    def create_plot_note(
        self,
        *,
        plot=None,
        author=None,
        content="Test note.",
        visibility="this_plot",
    ):
        """Create a plot note for test scenarios."""

        return PlotNote.objects.create(
            plot=plot or self.plot,
            author=author or self.user_one,
            content=content,
            visibility=visibility,
        )

    def add_active_plot_owner(self, *, plot=None, user=None, is_primary=False):
        """Grant active ownership on a plot for visibility tests."""

        return PlotOwnership.objects.create(
            plot=plot or self.plot,
            user=user or self.user_one,
            is_primary=is_primary,
        )

    def add_active_garden_member(self, *, garden=None, user=None, role="community_volunteer"):
        """Grant active garden membership for visibility tests."""

        return GardenMembership.objects.create(
            garden=garden or self.garden,
            user=user or self.user_one,
            role=role,
            status="active",
        )