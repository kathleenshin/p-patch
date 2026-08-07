import datetime

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient

from plots.models import Garden, Plot, PlotNote


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

        cls.other_plot = Plot.objects.create(
            garden=cls.garden,
            plot_number="2",
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

        cls.other_note = PlotNote.objects.create(
            plot=cls.other_plot,
            author=cls.user_two,
            content="Beans were watered.",
            visibility="garden_members",
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
            "plot_number": "3",
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