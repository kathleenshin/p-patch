from unittest.mock import Mock, patch

from django.test import SimpleTestCase

from notifications.services.email import send_email_notification
from notifications.services.email_provider import EmailDeliveryResult


class EmailCompatibilityWrapperTests(SimpleTestCase):
    @patch("notifications.services.email.NotificationService.from_settings")
    def test_send_email_notification_delegates_to_notification_service(self, mock_factory):
        service = Mock()
        expected_result = EmailDeliveryResult(
            message_id="compat-123",
            provider_response={"MessageId": "compat-123"},
        )
        service.send_email.return_value = expected_result
        mock_factory.return_value = service

        result = send_email_notification(
            ["person@example.com"],
            "Subject",
            "Body",
        )

        self.assertEqual(result, expected_result)
        mock_factory.assert_called_once_with()
        service.send_email.assert_called_once_with(
            recipients=["person@example.com"],
            subject="Subject",
            message="Body",
        )
