from django.test import SimpleTestCase

from notifications.services.email_provider import (
    EmailDeliveryError,
    EmailDeliveryResult,
    EmailProvider,
)


class EmailProviderTests(SimpleTestCase):
    def test_email_delivery_result_stores_delivery_information(self):
        result = EmailDeliveryResult(
            message_id="message-123",
            provider_response={"MessageId": "message-123"},
        )

        self.assertEqual(result.message_id, "message-123")
        self.assertEqual(
            result.provider_response,
            {"MessageId": "message-123"},
        )

    def test_email_delivery_result_defaults_provider_response_to_none(self):
        result = EmailDeliveryResult(message_id=None)

        self.assertIsNone(result.message_id)
        self.assertIsNone(result.provider_response)

    def test_email_provider_cannot_be_instantiated(self):
        with self.assertRaises(TypeError):
            EmailProvider()

    def test_email_delivery_error_is_runtime_error(self):
        self.assertTrue(issubclass(EmailDeliveryError, RuntimeError))