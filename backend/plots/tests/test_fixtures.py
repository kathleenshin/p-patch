import datetime

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient

from plots.models import Garden, Plot


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

        cls.plot_list_create_url = reverse("plot-list-create")
        cls.plot_detail_url = reverse(
            "plot-detail",
            kwargs={"pk": cls.plot.pk},
        )
        cls.unknown_plot_detail_url = reverse(
            "plot-detail",
            kwargs={"pk": 999999},
        )

    def setUp(self):
        self.client = APIClient()
        self.client.force_authenticate(user=self.user_one)

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