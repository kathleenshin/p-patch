import datetime

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone

from plots.models import Garden, Plot

from .models import HelpRequest


User = get_user_model()


class HelpRequestModelTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.creator = User.objects.create_user(
            username="creator",
            email="creator@example.com",
            password="password",
        )

        cls.assignee = User.objects.create_user(
            username="assignee",
            email="assignee@example.com",
            password="password",
        )

        cls.garden = Garden.objects.create(
            name="Judkins Park P-Patch",
        )

        cls.plot = Plot.objects.create(
            garden=cls.garden,
            plot_number="1",
        )

        cls.help_request = HelpRequest.objects.create(
            title="Repair fence",
            description="Repair the damaged fence near Plot 1.",
            garden=cls.garden,
            plot=cls.plot,
            created_by=cls.creator,
            priority=HelpRequest.Priority.HIGH,
            category=HelpRequest.Category.MAINTENANCE,
        )

    def test_create_help_request(self):
        self.assertEqual(
            self.help_request.title,
            "Repair fence",
        )
        self.assertEqual(
            self.help_request.description,
            "Repair the damaged fence near Plot 1.",
        )
        self.assertEqual(
            self.help_request.garden,
            self.garden,
        )
        self.assertEqual(
            self.help_request.plot,
            self.plot,
        )
        self.assertEqual(
            self.help_request.created_by,
            self.creator,
        )

    def test_status_defaults_to_active(self):
        self.assertEqual(
            self.help_request.status,
            HelpRequest.Status.ACTIVE,
        )

    def test_priority_defaults_to_medium(self):
        help_request = HelpRequest.objects.create(
            title="Clean shed",
            description="Clean the shared garden shed.",
            garden=self.garden,
            created_by=self.creator,
        )

        self.assertEqual(
            help_request.priority,
            HelpRequest.Priority.MEDIUM,
        )

    def test_category_defaults_to_other(self):
        help_request = HelpRequest.objects.create(
            title="General garden task",
            description="Help with a general garden task.",
            garden=self.garden,
            created_by=self.creator,
        )

        self.assertEqual(
            help_request.category,
            HelpRequest.Category.OTHER,
        )

    def test_plot_is_optional(self):
        help_request = HelpRequest.objects.create(
            title="Clean shed",
            description="Clean the shared garden shed.",
            garden=self.garden,
            created_by=self.creator,
        )

        self.assertIsNone(help_request.plot)

    def test_assigned_to_is_optional(self):
        self.assertIsNone(self.help_request.assigned_to)

    def test_due_date_is_optional(self):
        self.assertIsNone(self.help_request.due_date)

    def test_completed_at_is_optional(self):
        self.assertIsNone(self.help_request.completed_at)

    def test_help_request_can_be_assigned(self):
        self.help_request.assigned_to = self.assignee
        self.help_request.status = HelpRequest.Status.PENDING
        self.help_request.save()

        self.assertEqual(
            self.help_request.assigned_to,
            self.assignee,
        )
        self.assertEqual(
            self.help_request.status,
            HelpRequest.Status.PENDING,
        )

    def test_help_request_can_have_due_date(self):
        due_date = datetime.date(2026, 8, 15)

        self.help_request.due_date = due_date
        self.help_request.save()

        self.assertEqual(
            self.help_request.due_date,
            due_date,
        )

    def test_help_request_can_be_completed(self):
        completed_at = timezone.now()

        self.help_request.status = HelpRequest.Status.DONE
        self.help_request.completed_at = completed_at
        self.help_request.save()

        self.assertEqual(
            self.help_request.status,
            HelpRequest.Status.DONE,
        )
        self.assertEqual(
            self.help_request.completed_at,
            completed_at,
        )

    def test_help_request_remains_when_creator_is_deleted(self):
        help_request_id = self.help_request.id

        self.creator.delete()

        help_request = HelpRequest.objects.get(id=help_request_id)

        self.assertIsNone(help_request.created_by)

    def test_help_request_remains_when_assignee_is_deleted(self):
        self.help_request.assigned_to = self.assignee
        self.help_request.status = HelpRequest.Status.PENDING
        self.help_request.save()

        help_request_id = self.help_request.id
        self.assignee.delete()

        help_request = HelpRequest.objects.get(id=help_request_id)

        self.assertIsNone(help_request.assigned_to)

    def test_plot_deletion_does_not_delete_help_request(self):
        help_request_id = self.help_request.id

        self.plot.delete()

        help_request = HelpRequest.objects.get(id=help_request_id)

        self.assertIsNone(help_request.plot)

    def test_garden_deletion_deletes_help_request(self):
        help_request_id = self.help_request.id

        self.garden.delete()

        self.assertFalse(
            HelpRequest.objects.filter(id=help_request_id).exists()
        )

    def test_str(self):
        self.assertEqual(
            str(self.help_request),
            "Repair fence",
        )