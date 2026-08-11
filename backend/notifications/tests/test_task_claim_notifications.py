from unittest.mock import Mock, patch

from django.test import TestCase

from help_requests.models import HelpRequest
from notifications.services.email_provider import EmailDeliveryResult
from notifications.services.task_notifications import (
    notify_help_request_claimed,
)
from plots.models import Garden, Plot
from users.models import User


class NotifyHelpRequestClaimedTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.garden = Garden.objects.create(name="Claim Garden")
        cls.plot = Plot.objects.create(garden=cls.garden, plot_number="14")
        cls.creator = User.objects.create_user(
            email="creator@example.com",
            password="password123",
            first_name="Casey",
            last_name="Creator",
            is_approved=True,
        )
        cls.claimer = User.objects.create_user(
            email="claimer@example.com",
            password="password123",
            first_name="Devon",
            last_name="Claimer",
            is_approved=True,
        )

    @patch("notifications.services.task_notifications.get_active_garden_member_emails")
    @patch("notifications.services.task_notifications.get_urgent_help_request_recipient_emails")
    def test_notifies_only_creator_on_claim(
        self,
        mock_urgent_recipients,
        mock_active_recipients,
    ):
        help_request = HelpRequest.objects.create(
            title="Repair trellis",
            description="Needs two people to stabilize.",
            garden=self.garden,
            plot=self.plot,
            created_by=self.creator,
            assigned_to=self.claimer,
            status=HelpRequest.Status.PENDING,
        )

        service = Mock()
        service.send_email.return_value = EmailDeliveryResult(
            message_id="claim-123",
        )

        result = notify_help_request_claimed(
            help_request,
            notification_service=service,
        )

        self.assertEqual(result.message_id, "claim-123")
        service.send_email.assert_called_once()
        self.assertEqual(
            service.send_email.call_args.kwargs["recipients"],
            ["creator@example.com"],
        )
        self.assertIn(
            "Repair trellis",
            service.send_email.call_args.kwargs["subject"],
        )
        self.assertIn(
            "claimer@example.com",
            service.send_email.call_args.kwargs["message"],
        )
        self.assertIn(
            "Plot 14",
            service.send_email.call_args.kwargs["message"],
        )
        self.assertIn(
            "Claim Garden",
            service.send_email.call_args.kwargs["message"],
        )

        mock_active_recipients.assert_not_called()
        mock_urgent_recipients.assert_not_called()

    def test_skips_email_when_creator_claims_own_request(self):
        help_request = HelpRequest.objects.create(
            title="Self-claim task",
            description="Creator picked this up.",
            garden=self.garden,
            created_by=self.creator,
            assigned_to=self.creator,
            status=HelpRequest.Status.PENDING,
        )

        service = Mock()
        result = notify_help_request_claimed(
            help_request,
            notification_service=service,
        )

        self.assertIsNone(result)
        service.send_email.assert_not_called()

    def test_skips_email_when_creator_has_no_email(self):
        no_email_user = User.objects.create_user(
            email="tmp@example.com",
            password="password123",
            is_approved=True,
        )
        no_email_user.email = ""
        no_email_user.save(update_fields=["email"])

        help_request = HelpRequest.objects.create(
            title="No email creator",
            description="Creator cannot receive mail.",
            garden=self.garden,
            created_by=no_email_user,
            assigned_to=self.claimer,
            status=HelpRequest.Status.PENDING,
        )

        service = Mock()
        result = notify_help_request_claimed(
            help_request,
            notification_service=service,
        )

        self.assertIsNone(result)
        service.send_email.assert_not_called()

    def test_skips_email_when_creator_is_missing(self):
        help_request = HelpRequest.objects.create(
            title="Deleted creator",
            description="Creator account is gone.",
            garden=self.garden,
            created_by=None,
            assigned_to=self.claimer,
            status=HelpRequest.Status.PENDING,
        )

        service = Mock()
        result = notify_help_request_claimed(
            help_request,
            notification_service=service,
        )

        self.assertIsNone(result)
        service.send_email.assert_not_called()
