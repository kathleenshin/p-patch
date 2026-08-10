from django.test import TestCase

from plots.models import Plot, PlotOwnership
from notifications.services.recipients import (
    get_active_admin_emails,
    get_active_garden_member_emails,
    get_active_plot_steward_emails,
    get_weekly_summary_recipient_emails,
)
from notifications.tests.fixtures import (
    create_garden,
    create_membership,
    create_user,
)


class GetActiveGardenMemberEmailsTests(TestCase):
    def setUp(self):
        self.garden = create_garden()

    def test_returns_only_active_approved_members_with_email(self):
        active_user = create_user(
            username="active-user",
            email="active@example.com",
        )
        inactive_user = create_user(
            username="inactive-user",
            email="inactive@example.com",
        )
        unapproved_user = create_user(
            username="unapproved-user",
            email="unapproved@example.com",
            is_approved=False,
        )
        missing_email_user = create_user(
            username="missing-email-user",
            email="temporary@example.com",
        )
        missing_email_user.email = ""
        missing_email_user.save(update_fields=["email"])

        create_membership(
            garden=self.garden,
            user=active_user,
            status="active",
        )
        create_membership(
            garden=self.garden,
            user=inactive_user,
            status="inactive",
        )
        create_membership(
            garden=self.garden,
            user=unapproved_user,
            status="active",
        )
        create_membership(
            garden=self.garden,
            user=missing_email_user,
            status="active",
        )

        emails = get_active_garden_member_emails(
            self.garden,
        )

        self.assertEqual(
            emails,
            ["active@example.com"],
        )

    def test_returns_empty_list_when_no_members_are_eligible(self):
        user = create_user(
            username="pending-user",
            email="pending@example.com",
        )
        create_membership(
            garden=self.garden,
            user=user,
            status="pending",
        )

        emails = get_active_garden_member_emails(
            self.garden,
        )

        self.assertEqual(emails, [])


class WeeklySummaryRecipientTests(TestCase):
    def setUp(self):
        self.garden = create_garden()
        self.plot = Plot.objects.create(
            garden=self.garden,
            plot_number="1",
        )

    def test_returns_active_plot_stewards(self):
        user = create_user(
            username="steward",
            email="steward@example.com",
        )

        PlotOwnership.objects.create(
            plot=self.plot,
            user=user,
        )

        emails = get_active_plot_steward_emails(
            self.garden,
        )

        self.assertEqual(
            emails,
            ["steward@example.com"],
        )

    def test_returns_active_admins(self):
        admin = create_user(
            username="admin",
            email="admin@example.com",
        )

        create_membership(
            garden=self.garden,
            user=admin,
            role="admin",
            status="active",
        )

        emails = get_active_admin_emails(
            self.garden,
        )

        self.assertEqual(
            emails,
            ["admin@example.com"],
        )

    def test_weekly_summary_combines_stewards_and_admins_without_duplicates(self):
        user = create_user(
            username="steward-admin",
            email="both@example.com",
        )

        PlotOwnership.objects.create(
            plot=self.plot,
            user=user,
        )

        # Plot ownership automatically creates the garden membership.
        membership = user.garden_memberships.get(
            garden=self.garden,
        )
        membership.role = "admin"
        membership.status = "active"
        membership.save(
            update_fields=["role", "status"],
        )

        emails = get_weekly_summary_recipient_emails(
            self.garden,
        )

        self.assertEqual(
            emails,
            ["both@example.com"],
        )