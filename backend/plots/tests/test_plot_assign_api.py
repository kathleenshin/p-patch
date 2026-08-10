from django.urls import reverse

from plots.models import GardenMembership, PlotOwnership

from .test_fixtures import BasePlotAPITestCase, User


class PlotAssignAPITests(BasePlotAPITestCase):
    """POST /api/plots/<pk>/assign/ — garden admin sets primary steward."""

    @classmethod
    def setUpTestData(cls):
        super().setUpTestData()
        # Caller must be garden admin (IsGardenAdmin on the view).
        cls.admin = User.objects.create_user(
            email="garden-admin@example.com",
            password="password",
            is_approved=True,
            is_garden_admin=True,
        )
        # Happy-path assignee: approved member becomes primary steward.
        cls.member = User.objects.create_user(
            email="approved-member@example.com",
            password="password",
            first_name="Ada",
            last_name="Member",
            is_approved=True,
        )
        # Pending users must be rejected by PlotAssignSerializer.
        cls.pending = User.objects.create_user(
            email="pending-member@example.com",
            password="password",
            is_approved=False,
        )
        # other_plot starts with no owners in BasePlotTestCase fixtures.
        cls.assign_url = reverse(
            "plot-assign",
            kwargs={"pk": cls.other_plot.pk},
        )

    def test_garden_admin_can_assign_primary_steward(self):
        """Creates PlotOwnership + garden membership; plot appears on user.plots."""
        self.client.force_authenticate(user=self.admin)

        response = self.client.post(
            self.assign_url,
            {"user_id": self.member.id},
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        owners = response.json()["owners"]
        self.assertEqual(len(owners), 1)
        self.assertEqual(owners[0]["id"], self.member.id)
        self.assertTrue(owners[0]["is_primary"])

        # Join table is the source of truth for plot↔user.
        ownership = PlotOwnership.objects.get(
            plot=self.other_plot,
            user=self.member,
            end_date__isnull=True,
        )
        self.assertTrue(ownership.is_primary)
        # PlotOwnership.save() → ensure_garden_membership().
        self.assertTrue(
            GardenMembership.objects.filter(
                garden=self.other_plot.garden,
                user=self.member,
                status="active",
            ).exists()
        )
        # Reverse M2M from User through PlotOwnership.
        self.assertIn(self.other_plot, self.member.plots.all())

    def test_non_admin_cannot_assign(self):
        """Approved members get 403 — assign is garden-admin only."""
        self.client.force_authenticate(user=self.member)

        response = self.client.post(
            self.assign_url,
            {"user_id": self.member.id},
            format="json",
        )

        self.assertEqual(response.status_code, 403)

    def test_cannot_assign_pending_user(self):
        """Serializer rejects unapproved user_id before ownership is created."""
        self.client.force_authenticate(user=self.admin)

        response = self.client.post(
            self.assign_url,
            {"user_id": self.pending.id},
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("user_id", response.json())

    def test_cannot_assign_plot_that_already_has_steward(self):
        """Endpoint is for unassigned plots only (no second primary)."""
        PlotOwnership.objects.create(
            plot=self.other_plot,
            user=self.member,
            is_primary=True,
        )
        other_member = User.objects.create_user(
            email="second-member@example.com",
            password="password",
            is_approved=True,
        )
        self.client.force_authenticate(user=self.admin)

        response = self.client.post(
            self.assign_url,
            {"user_id": other_member.id},
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("already has an active steward", response.json()["detail"])
