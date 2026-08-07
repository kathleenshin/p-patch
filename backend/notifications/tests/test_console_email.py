from unittest.mock import patch

from django.test import SimpleTestCase, override_settings

from notifications.services.console_email import ConsoleEmailService
from notifications.services.email_provider import EmailDeliveryError


@override_settings(
    NOTIFICATIONS_EMAIL_SENDER="sender@example.com",
)
class ConsoleEmailServiceTests(SimpleTestCase):
    @patch("notifications.services.console_email.send_mail")
    def test_sends_email_using_django_backend(self, mock_send_mail):
        mock_send_mail.return_value = 1
        service = ConsoleEmailService.from_settings()

        result = service.send_email(
            recipients=["recipient@example.com"],
            subject="Test subject",
            message="Test body",
        )

        mock_send_mail.assert_called_once_with(
            subject="Test subject",
            message="Test body",
            from_email="sender@example.com",
            recipient_list=["recipient@example.com"],
            fail_silently=False,
        )

        self.assertIsNone(result.message_id)
        self.assertEqual(
            result.provider_response,
            {
                "backend": "django",
                "delivered_count": 1,
            },
        )

    @patch("notifications.services.console_email.send_mail")
    def test_uses_explicit_sender_override(self, mock_send_mail):
        mock_send_mail.return_value = 1
        service = ConsoleEmailService.from_settings()

        service.send_email(
            sender="override@example.com",
            recipients=["recipient@example.com"],
            subject="Test subject",
            message="Test body",
        )

        self.assertEqual(
            mock_send_mail.call_args.kwargs["from_email"],
            "override@example.com",
        )

    @patch("notifications.services.console_email.send_mail")
    def test_skips_when_no_recipients_are_provided(self, mock_send_mail):
        service = ConsoleEmailService.from_settings()

        result = service.send_email(
            recipients=[],
            subject="Test subject",
            message="Test body",
        )

        self.assertEqual(
            result.provider_response,
            {
                "skipped": True,
                "reason": "no_recipients",
            },
        )
        mock_send_mail.assert_not_called()

    @override_settings(NOTIFICATIONS_EMAIL_SENDER=None)
    def test_raises_when_sender_is_missing(self):
        service = ConsoleEmailService.from_settings()

        with self.assertRaisesMessage(
            EmailDeliveryError,
            "Sender email is not configured.",
        ):
            service.send_email(
                recipients=["recipient@example.com"],
                subject="Test subject",
                message="Test body",
            )