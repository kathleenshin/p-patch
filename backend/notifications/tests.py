from unittest.mock import patch

from django.test import SimpleTestCase, TestCase, override_settings

from help_requests.models import HelpRequest
from notifications.services.email import send_email_notification
from notifications.services.recipients import get_active_garden_member_emails
from notifications.services.task_notifications import notify_new_help_request
from plots.models import Garden, GardenMembership, Plot
from users.models import User


class SendEmailNotificationTests(SimpleTestCase):
    @override_settings(DEFAULT_FROM_EMAIL="from@example.com")
    @patch("notifications.services.email.send_mail")
    def test_sends_email_to_all_recipients(self, mock_send_mail):
        # Django send_mail returns message count (0/1), not address count.
        mock_send_mail.return_value = 1

        result = send_email_notification(
            recipients=["first@example.com", "second@example.com"],
            subject="Test subject",
            message="Test message",
        )

        # Our helper reports how many addresses were targeted.
        self.assertEqual(result, 2)
        mock_send_mail.assert_called_once_with(
            subject="Test subject",
            message="Test message",
            from_email="from@example.com",
            recipient_list=["first@example.com", "second@example.com"],
            fail_silently=False,
        )

    def test_returns_zero_when_no_recipients_are_provided(self):
        with patch("notifications.services.email.send_mail") as mock_send_mail:
            result = send_email_notification(
                recipients=[],
                subject="Test subject",
                message="Test message",
            )

        self.assertEqual(result, 0)
        mock_send_mail.assert_not_called()


class GetActiveGardenMemberEmailsTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.garden = Garden.objects.create(name="Garden A")
        cls.active_user = User.objects.create_user(
            email="active@example.com",
            password="password123",
            is_approved=True,
        )
        cls.inactive_user = User.objects.create_user(
            email="inactive@example.com",
            password="password123",
            is_approved=True,
        )
        cls.unapproved_user = User.objects.create_user(
            email="unapproved@example.com",
            password="password123",
            is_approved=False,
        )
        cls.missing_email_user = User.objects.create_user(
            email="noemail@example.com",
            password="password123",
            is_approved=True,
        )
        cls.missing_email_user.email = ""
        cls.missing_email_user.save(update_fields=["email"])

        GardenMembership.objects.create(
            garden=cls.garden,
            user=cls.active_user,
            status="active",
        )
        GardenMembership.objects.create(
            garden=cls.garden,
            user=cls.inactive_user,
            status="inactive",
        )
        GardenMembership.objects.create(
            garden=cls.garden,
            user=cls.unapproved_user,
            status="active",
        )
        GardenMembership.objects.create(
            garden=cls.garden,
            user=cls.missing_email_user,
            status="active",
        )

    def test_returns_emails_for_active_approved_members_only(self):
        emails = get_active_garden_member_emails(self.garden)

        self.assertEqual(emails, ["active@example.com"])


class NotifyNewHelpRequestTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.garden = Garden.objects.create(name="Garden A")
        cls.user = User.objects.create_user(
            email="creator@example.com",
            password="password123",
            is_approved=True,
        )
        cls.plot = Plot.objects.create(
            garden=cls.garden,
            plot_number="12",
        )
        cls.help_request_with_plot = HelpRequest.objects.create(
            garden=cls.garden,
            plot=cls.plot,
            title="Water plants",
            description="Please water the tomatoes.",
            created_by=cls.user,
        )
        cls.help_request_without_plot = HelpRequest.objects.create(
            garden=cls.garden,
            title="Fix fence",
            description="The fence needs repair.",
            created_by=cls.user,
        )

    @patch("notifications.services.task_notifications.send_email_notification")
    @patch("notifications.services.task_notifications.get_active_garden_member_emails")
    def test_notifies_garden_members_for_plot_help_request(
        self,
        mock_get_emails,
        mock_send_email,
    ):
        mock_get_emails.return_value = ["member@example.com"]
        mock_send_email.return_value = 1

        help_request = self.help_request_with_plot

        result = notify_new_help_request(help_request)

        self.assertEqual(result, 1)
        mock_get_emails.assert_called_once_with(self.garden)
        mock_send_email.assert_called_once()
        recipients, subject, message = mock_send_email.call_args.args
        self.assertEqual(recipients, ["member@example.com"])
        self.assertEqual(subject, "New help request for Plot 12")
        self.assertIn("Water plants", message)
        self.assertIn("Please water the tomatoes.", message)
        self.assertIn("Plot 12", message)

    @patch("notifications.services.task_notifications.send_email_notification")
    @patch("notifications.services.task_notifications.get_active_garden_member_emails")
    def test_notifies_garden_members_when_no_plot_is_attached(
        self,
        mock_get_emails,
        mock_send_email,
    ):
        mock_get_emails.return_value = ["member@example.com"]
        mock_send_email.return_value = 1

        help_request = self.help_request_without_plot

        notify_new_help_request(help_request)

        _, subject, message = mock_send_email.call_args.args
        self.assertEqual(subject, "New garden help request")
        self.assertIn("Garden A", message)
        self.assertIn("Fix fence", message)
        self.assertIn("The fence needs repair.", message)

    @override_settings(DEFAULT_FROM_EMAIL="from@example.com")
    @patch("notifications.services.email.send_mail")
    def test_notify_returns_address_count_not_message_count(self, mock_send_mail):
        """Regression: Django send_mail returns 1; callers need recipient count."""
        mock_send_mail.return_value = 1
        member_a = User.objects.create_user(
            email="a@example.com",
            password="password123",
            is_approved=True,
        )
        member_b = User.objects.create_user(
            email="b@example.com",
            password="password123",
            is_approved=True,
        )
        member_c = User.objects.create_user(
            email="c@example.com",
            password="password123",
            is_approved=True,
        )
        for user in (member_a, member_b, member_c):
            GardenMembership.objects.create(
                garden=self.garden,
                user=user,
                status="active",
            )

        result = notify_new_help_request(self.help_request_without_plot)

        self.assertEqual(result, 3)
        mock_send_mail.assert_called_once()
        self.assertEqual(len(mock_send_mail.call_args.kwargs["recipient_list"]), 3)
