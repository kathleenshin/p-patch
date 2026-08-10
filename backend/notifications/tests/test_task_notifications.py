from unittest.mock import Mock

from django.test import TestCase

from plots.models import PlotOwnership

from notifications.services.email_provider import EmailDeliveryResult
from notifications.services.task_notifications import (
    notify_urgent_help_request,
)
from notifications.tests.fixtures import (
    create_garden,
    create_help_request,
    create_plot,
    create_user,
)


class NotifyUrgentHelpRequestTests(TestCase):
    def setUp(self):
        self.garden = create_garden(name="Garden A")
        self.user = create_user(
            username="garden-member",
            email="member@example.com",
        )
        self.plot = create_plot(
            garden=self.garden,
            plot_number="12",
        )

        PlotOwnership.objects.create(
            plot=self.plot,
            user=self.user,
        )

        self.notification_service = Mock()
        self.notification_service.send_email.return_value = (
            EmailDeliveryResult(
                message_id="message-123",
                provider_response={
                    "MessageId": "message-123",
                },
            )
        )

    def test_notifies_plot_stewards_about_plot_help_request(self):
        help_request = create_help_request(
            garden=self.garden,
            created_by=self.user,
            plot=self.plot,
            title="Water plants",
            description="Please water the tomatoes.",
        )

        result = notify_urgent_help_request(
            help_request,
            notification_service=self.notification_service,
        )

        self.assertEqual(result.message_id, "message-123")

        self.notification_service.send_email.assert_called_once()

        kwargs = self.notification_service.send_email.call_args.kwargs

        self.assertEqual(
            kwargs["recipients"],
            ["member@example.com"],
        )
        self.assertEqual(
            kwargs["subject"],
            "Urgent help request for Plot 12",
        )
        self.assertIn(
            "Plot 12 at Garden A",
            kwargs["message"],
        )
        self.assertIn(
            "Task: Water plants",
            kwargs["message"],
        )
        self.assertIn(
            "Description: Please water the tomatoes.",
            kwargs["message"],
        )

    def test_notifies_plot_stewards_about_garden_help_request(self):
        help_request = create_help_request(
            garden=self.garden,
            created_by=self.user,
            plot=None,
            title="Fix fence",
            description="The fence needs repair.",
        )

        notify_urgent_help_request(
            help_request,
            notification_service=self.notification_service,
        )

        kwargs = self.notification_service.send_email.call_args.kwargs

        self.assertEqual(
            kwargs["subject"],
            "Urgent garden help request",
        )
        self.assertIn(
            "Garden A",
            kwargs["message"],
        )
        self.assertIn(
            "Task: Fix fence",
            kwargs["message"],
        )
        self.assertIn(
            "Description: The fence needs repair.",
            kwargs["message"],
        )

    def test_sends_empty_recipient_list_when_no_plot_stewards_are_eligible(self):
        PlotOwnership.objects.all().delete()

        help_request = create_help_request(
            garden=self.garden,
            created_by=self.user,
            plot=self.plot,
        )

        notify_urgent_help_request(
            help_request,
            notification_service=self.notification_service,
        )

        kwargs = self.notification_service.send_email.call_args.kwargs

        self.assertEqual(kwargs["recipients"], [])