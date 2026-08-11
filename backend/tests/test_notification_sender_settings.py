"""Sender settings used by NotificationService / SES."""

from django.test import SimpleTestCase, override_settings


class NotificationSenderSettingsTests(SimpleTestCase):
    @override_settings(
        DEFAULT_FROM_EMAIL="Judkins Park P-Patch <from@example.com>",
        NOTIFICATIONS_EMAIL_SENDER="Judkins Park P-Patch <from@example.com>",
    )
    def test_notification_service_uses_configured_sender(self):
        from notifications.services.notification_service import NotificationService

        service = NotificationService.from_settings()
        self.assertEqual(
            service.sender_email,
            "Judkins Park P-Patch <from@example.com>",
        )
