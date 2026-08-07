from unittest.mock import Mock

from botocore.exceptions import ClientError
from django.test import SimpleTestCase, override_settings

from notifications.services.email_provider import EmailDeliveryError
from notifications.services.ses_email import SESEmailService


@override_settings(
    NOTIFICATIONS_EMAIL_SENDER="sender@example.com",
    NOTIFICATIONS_AWS_REGION="us-west-2",
)
class SESEmailServiceTests(SimpleTestCase):
    def setUp(self):
        self.mock_client = Mock()
        self.mock_client_factory = Mock(
            return_value=self.mock_client,
        )

    def create_service(self):
        return SESEmailService.from_settings(
            client_factory=self.mock_client_factory,
        )

    def test_creates_ses_client_using_configured_region(self):
        service = self.create_service()

        self.mock_client_factory.assert_called_once_with(
            "ses",
            region_name="us-west-2",
        )
        self.assertIs(service._client, self.mock_client)
        self.assertEqual(
            service.sender_email,
            "sender@example.com",
        )

    def test_sends_email_with_expected_ses_parameters(self):
        self.mock_client.send_email.return_value = {
            "MessageId": "message-123",
        }
        service = self.create_service()

        result = service.send_email(
            recipients=[
                "first@example.com",
                "second@example.com",
            ],
            subject="Test subject",
            message="Test message",
        )

        self.assertEqual(result.message_id, "message-123")
        self.assertEqual(
            result.provider_response,
            {"MessageId": "message-123"},
        )

        self.mock_client.send_email.assert_called_once_with(
            Source="sender@example.com",
            Destination={
                "ToAddresses": [
                    "first@example.com",
                    "second@example.com",
                ],
            },
            Message={
                "Subject": {
                    "Data": "Test subject",
                    "Charset": "UTF-8",
                },
                "Body": {
                    "Text": {
                        "Data": "Test message",
                        "Charset": "UTF-8",
                    },
                },
            },
        )

    def test_uses_explicit_sender_override(self):
        self.mock_client.send_email.return_value = {
            "MessageId": "message-123",
        }
        service = self.create_service()

        service.send_email(
            sender="override@example.com",
            recipients=["recipient@example.com"],
            subject="Test subject",
            message="Test message",
        )

        self.assertEqual(
            self.mock_client.send_email.call_args.kwargs["Source"],
            "override@example.com",
        )

    def test_returns_skipped_result_when_no_recipients_are_provided(self):
        service = self.create_service()

        result = service.send_email(
            subject="Test subject",
            message="Test message",
            recipients=[],
        )

        self.assertIsNone(result.message_id)
        self.assertEqual(
            result.provider_response,
            {
                "skipped": True,
                "reason": "no_recipients",
            },
        )
        self.mock_client.send_email.assert_not_called()

    @override_settings(NOTIFICATIONS_EMAIL_SENDER=None)
    def test_raises_when_sender_is_missing(self):
        service = self.create_service()

        with self.assertRaisesMessage(
            EmailDeliveryError,
            "Sender email is not configured.",
        ):
            service.send_email(
                recipients=["recipient@example.com"],
                subject="Test subject",
                message="Test message",
            )

    def test_wraps_ses_client_error(self):
        self.mock_client.send_email.side_effect = ClientError(
            {
                "Error": {
                    "Code": "MessageRejected",
                    "Message": "Email rejected",
                },
            },
            "SendEmail",
        )
        service = self.create_service()

        with self.assertRaisesMessage(
            EmailDeliveryError,
            "SES could not deliver the email.",
        ):
            service.send_email(
                recipients=["recipient@example.com"],
                subject="Test subject",
                message="Test message",
            )