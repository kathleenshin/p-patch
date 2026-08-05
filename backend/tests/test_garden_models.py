from django.db import IntegrityError

from plots.models import Garden, GardenMembership

from .test_fixtures import BasePlotTestCase


class GardenModelTests(BasePlotTestCase):
    def test_str(self):
        self.assertEqual(
            str(self.garden),
            "Judkins Park P-Patch",
        )


class GardenMembershipModelTests(BasePlotTestCase):
    def test_defaults_role_and_status(self):
        membership = GardenMembership.objects.create(
            user=self.user_one,
            garden=self.garden,
        )

        self.assertEqual(
            membership.role,
            "community_volunteer",
        )
        self.assertEqual(
            membership.status,
            "pending",
        )

    def test_unique_membership_per_garden_and_user(self):
        GardenMembership.objects.create(
            user=self.user_one,
            garden=self.garden,
        )

        with self.assertRaises(IntegrityError):
            GardenMembership.objects.create(
                user=self.user_one,
                garden=self.garden,
            )

    def test_user_can_join_multiple_gardens(self):
        other_garden = Garden.objects.create(
            name="Ballard P-Patch",
        )

        first = GardenMembership.objects.create(
            user=self.user_one,
            garden=self.garden,
        )

        second = GardenMembership.objects.create(
            user=self.user_one,
            garden=other_garden,
        )

        self.assertEqual(first.garden, self.garden)
        self.assertEqual(second.garden, other_garden)