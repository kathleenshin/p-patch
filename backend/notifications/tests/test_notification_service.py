from unittest.mock import Mock, patch

from django.test import SimpleTestCase, override_settings

from notifications.services.email_provider import (
    EmailDeliveryError,
    EmailDeliveryResult,
)
from notifications.services.notification_service import (
    NotificationService,
)


@override_settings(
    NOTIFICATIONS_EMAIL_SENDER="sender@example.com",
    NOTIFICATIONS_RECIPIENTS=(),
)
class NotificationServiceTests(SimpleTestCase):
    def test_delegates_to_email_provider(self):
        provider = Mock()
        expected_result = EmailDeliveryResult(
            message_id="message-123",
            provider_response={"MessageId": "message-123"},
        )
        provider.send_email.return_value = expected_result

        service = NotificationService(provider)

        result = service.send_email(
            recipients=["recipient@example.com"],
            subject="Test subject",
            message="Test message",
        )

        self.assertEqual(result, expected_result)
        provider.send_email.assert_called_once_with(
            sender="sender@example.com",
            recipients=["recipient@example.com"],
            subject="Test subject",
            message="Test message",
        )

    def test_uses_default_recipients_when_recipients_are_none(self):
        provider = Mock()
        provider.send_email.return_value = EmailDeliveryResult(
            message_id="message-123",
        )

        service = NotificationService(
            provider,
            default_recipients=(
                "default1@example.com",
                "default2@example.com",
            ),
        )

        service.send_email(
            subject="Test subject",
            message="Test message",
        )

        provider.send_email.assert_called_once_with(
            sender="sender@example.com",
            recipients=[
                "default1@example.com",
                "default2@example.com",
            ],
            subject="Test subject",
            message="Test message",
        )

    def test_explicit_empty_recipient_list_skips_delivery(self):
        provider = Mock()

        service = NotificationService(
            provider,
            default_recipients=("default@example.com",),
        )

        result = service.send_email(
            recipients=[],
            subject="Test subject",
            message="Test message",
        )

        self.assertEqual(
            result.provider_response,
            {
                "skipped": True,
                "reason": "no_recipients",
            },
        )
        provider.send_email.assert_not_called()

    def test_uses_explicit_sender_override(self):
        provider = Mock()
        provider.send_email.return_value = EmailDeliveryResult(
            message_id="message-123",
        )
        service = NotificationService(provider)

        service.send_email(
            sender="override@example.com",
            recipients=["recipient@example.com"],
            subject="Test subject",
            message="Test message",
        )

        self.assertEqual(
            provider.send_email.call_args.kwargs["sender"],
            "override@example.com",
        )

    @override_settings(NOTIFICATIONS_EMAIL_SENDER=None)
    def test_raises_when_sender_is_missing(self):
        service = NotificationService(Mock())

        with self.assertRaisesMessage(
            EmailDeliveryError,
            "Sender email is not configured.",
        ):
            service.send_email(
                recipients=["recipient@example.com"],
                subject="Test subject",
                message="Test message",
            )

    @override_settings(EMAIL_PROVIDER="console")
    @patch(
        "notifications.services.notification_service."
        "ConsoleEmailService.from_settings"
    )
    def test_from_settings_builds_console_provider(
        self,
        mock_console_factory,
    ):
        provider = Mock()
        mock_console_factory.return_value = provider

        service = NotificationService.from_settings()

        self.assertIs(service.email_provider, provider)
        mock_console_factory.assert_called_once_with()

    @override_settings(EMAIL_PROVIDER="ses")
    @patch(
        "notifications.services.notification_service."
        "SESEmailService.from_settings"
    )
    def test_from_settings_builds_ses_provider(
        self,
        mock_ses_factory,
    ):
        provider = Mock()
        mock_ses_factory.return_value = provider

        service = NotificationService.from_settings()

        self.assertIs(service.email_provider, provider)
        mock_ses_factory.assert_called_once_with()

    @override_settings(EMAIL_PROVIDER="unsupported")
    def test_from_settings_rejects_unknown_provider(self):
        with self.assertRaisesMessage(
            ValueError,
            "Unsupported email provider: unsupported",
        ):
            NotificationService.from_settings()