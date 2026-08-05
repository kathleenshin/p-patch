import datetime

from django.contrib.auth import get_user_model
from django.test import TestCase

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

        cls.admin_user = User.objects.create_user(
            email="fixture-admin@example.com",
            password="password",
            is_staff=True,
        )

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