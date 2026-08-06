from unittest.mock import Mock, patch

from django.test import SimpleTestCase, TestCase, override_settings

from help_requests.models import HelpRequest
from notifications.services.email_provider import EmailDeliveryError, EmailDeliveryResult
from notifications.services.notification_service import NotificationService
from notifications.services.recipients import get_active_garden_member_emails
from notifications.services.ses_email import ClientError, SESEmailService
from notifications.services.task_notifications import notify_new_help_request
from plots.models import Garden, GardenMembership, Plot
from users.models import User


@override_settings(
    NOTIFICATIONS_EMAIL_SENDER="sender@example.com",
    NOTIFICATIONS_AWS_REGION="us-west-2",
    NOTIFICATIONS_RECIPIENTS=("default1@example.com", "default2@example.com"),
)
class SESEmailServiceTests(SimpleTestCase):
    @patch("notifications.services.ses_email.boto3.client")
    def test_creates_ses_client_using_settings(self, mock_boto_client):
        mock_client = Mock()
        mock_boto_client.return_value = mock_client

        service = SESEmailService.from_settings()

        mock_boto_client.assert_called_once_with("ses", region_name="us-west-2")
        self.assertIs(service._client, mock_client)
        self.assertEqual(service.sender_email, "sender@example.com")

    @patch("notifications.services.ses_email.boto3.client")
    def test_sends_email_with_expected_ses_parameters(self, mock_boto_client):
        mock_client = Mock()
        mock_client.send_email.return_value = {"MessageId": "message-123"}
        mock_boto_client.return_value = mock_client

        service = SESEmailService.from_settings()
        result = service.send_email(
            recipients=["first@example.com", "second@example.com"],
            subject="Test subject",
            message="Test message",
        )

        self.assertEqual(
            result,
            EmailDeliveryResult(
                message_id="message-123",
                provider_response={"MessageId": "message-123"},
            ),
        )
        mock_client.send_email.assert_called_once_with(
            Source="sender@example.com",
            Destination={"ToAddresses": ["first@example.com", "second@example.com"]},
            Message={
                "Subject": {"Data": "Test subject", "Charset": "UTF-8"},
                "Body": {
                    "Text": {"Data": "Test message", "Charset": "UTF-8"},
                },
            },
        )

    @patch("notifications.services.ses_email.boto3.client")
    def test_returns_skipped_result_when_no_recipients_are_provided(self, mock_boto_client):
        mock_client = Mock()
        mock_boto_client.return_value = mock_client

        service = SESEmailService.from_settings()
        result = service.send_email(
            subject="Test subject",
            message="Test message",
            recipients=[],
        )

        self.assertEqual(
            result,
            EmailDeliveryResult(
                message_id=None,
                provider_response={"skipped": True, "reason": "no_recipients"},
            ),
        )
        mock_client.send_email.assert_not_called()

    @patch("notifications.services.ses_email.boto3.client")
    def test_wraps_ses_failures_in_email_delivery_error(self, mock_boto_client):
        mock_client = Mock()
        mock_client.send_email.side_effect = ClientError("boom")
        mock_boto_client.return_value = mock_client

        service = SESEmailService.from_settings()

        with self.assertRaises(EmailDeliveryError):
            service.send_email(
                recipients=["first@example.com"],
                subject="Test subject",
                message="Test message",
            )


class NotificationServiceTests(SimpleTestCase):
    def test_delegates_to_provider_with_expected_payload(self):
        provider = Mock()
        provider.send_email.return_value = EmailDeliveryResult(
            message_id="message-abc",
            provider_response={"MessageId": "message-abc"},
        )

        service = NotificationService(
            provider,
            sender_email="sender@example.com",
            default_recipients=("default@example.com",),
        )
        result = service.send_email(
            recipients=["recipient@example.com"],
            subject="Hello",
            message="World",
        )

        self.assertEqual(result.message_id, "message-abc")
        provider.send_email.assert_called_once_with(
            sender="sender@example.com",
            recipients=["recipient@example.com"],
            subject="Hello",
            message="World",
        )

    def test_uses_default_recipients_when_none_are_provided(self):
        provider = Mock()
        provider.send_email.return_value = EmailDeliveryResult(
            message_id="message-abc",
            provider_response={"MessageId": "message-abc"},
        )

        service = NotificationService(
            provider,
            sender_email="sender@example.com",
            default_recipients=("default@example.com",),
        )
        service.send_email(
            subject="Hello",
            message="World",
        )

        provider.send_email.assert_called_once_with(
            sender="sender@example.com",
            recipients=["default@example.com"],
            subject="Hello",
            message="World",
        )

    def test_returns_skipped_result_when_no_recipients_are_available(self):
        provider = Mock()
        service = NotificationService(provider, sender_email="sender@example.com")

        result = service.send_email(
            subject="Hello",
            message="World",
            recipients=[],
        )

        self.assertEqual(
            result,
            EmailDeliveryResult(
                message_id=None,
                provider_response={"skipped": True, "reason": "no_recipients"},
            ),
        )
        provider.send_email.assert_not_called()

    def test_raises_when_sender_is_missing(self):
        provider = Mock()
        service = NotificationService(provider, sender_email=None)

        with self.assertRaises(EmailDeliveryError):
            service.send_email(
                subject="Hello",
                message="World",
                recipients=["recipient@example.com"],
            )

    @override_settings(
        NOTIFICATIONS_EMAIL_SENDER="sender@example.com",
        NOTIFICATIONS_RECIPIENTS=("default@example.com",),
    )
    @patch("notifications.services.notification_service.SESEmailService.from_settings")
    def test_from_settings_uses_the_configured_defaults(self, mock_provider_factory):
        provider = Mock()
        mock_provider_factory.return_value = provider

        service = NotificationService.from_settings()

        self.assertIs(service.email_provider, provider)
        self.assertEqual(service.sender_email, "sender@example.com")
        self.assertEqual(service.default_recipients, ("default@example.com",))


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

        GardenMembership.objects.create(
            garden=cls.garden,
            user=cls.user,
            status="active",
        )

    def test_notifies_garden_members_for_plot_help_request(self):
        notification_service = Mock()
        notification_service.send_email.return_value = EmailDeliveryResult(
            message_id="message-1",
            provider_response={"MessageId": "message-1"},
        )

        result = notify_new_help_request(
            self.help_request_with_plot,
            notification_service=notification_service,
        )

        self.assertEqual(result.message_id, "message-1")
        notification_service.send_email.assert_called_once()
        call_kwargs = notification_service.send_email.call_args.kwargs
        self.assertEqual(call_kwargs["recipients"], ["creator@example.com"])
        self.assertEqual(call_kwargs["subject"], "New help request for Plot 12")
        self.assertIn("Water plants", call_kwargs["message"])
        self.assertIn("Please water the tomatoes.", call_kwargs["message"])
        self.assertIn("Plot 12", call_kwargs["message"])

    def test_notifies_garden_members_when_no_plot_is_attached(self):
        notification_service = Mock()
        notification_service.send_email.return_value = EmailDeliveryResult(
            message_id="message-1",
            provider_response={"MessageId": "message-1"},
        )

        notify_new_help_request(
            self.help_request_without_plot,
            notification_service=notification_service,
        )

        call_kwargs = notification_service.send_email.call_args.kwargs
        self.assertEqual(call_kwargs["subject"], "New garden help request")
        self.assertIn("Garden A", call_kwargs["message"])
        self.assertIn("Fix fence", call_kwargs["message"])
        self.assertIn("The fence needs repair.", call_kwargs["message"])
