from datetime import date
from unittest.mock import Mock, patch

from django.test import TestCase, override_settings
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from notifications.services.email_provider import EmailDeliveryResult
from notifications.services.weekly_summary import (
    notify_weekly_summary_for_garden,
)
from notifications.tests.fixtures import (
    create_garden,
    create_membership,
    create_plot,
    create_user,
)


@override_settings(NOTIFICATIONS_WEBHOOK_TOKEN="test-webhook-token")
class WeeklySummaryServiceTests(TestCase):
    def setUp(self):
        self.garden = create_garden(name="Garden A")

    def test_includes_active_plot_steward(self):
        user = create_user(
            username="steward",
            email="steward@example.com",
        )
        plot = create_plot(garden=self.garden, plot_number="1")
        plot.owners.add(user, through_defaults={"end_date": None})

        notification_service = Mock()
        notification_service.send_email.return_value = EmailDeliveryResult(
            message_id="message-123",
            provider_response={"MessageId": "message-123"},
        )

        result = notify_weekly_summary_for_garden(
            self.garden,
            notification_service=notification_service,
        )

        self.assertEqual(result.message_id, "message-123")

        notification_service.send_email.assert_called_once()
        kwargs = notification_service.send_email.call_args.kwargs

        self.assertEqual(kwargs["recipients"], ["steward@example.com"])
        self.assertEqual(kwargs["subject"], "Weekly summary for Garden A")
        self.assertIn("Weekly summary for Garden A is ready.", kwargs["message"])

    def test_includes_active_admin_without_plot(self):
        admin = create_user(
            username="admin",
            email="admin@example.com",
        )
        create_membership(
            garden=self.garden,
            user=admin,
            role="admin",
            status="active",
        )

        notification_service = Mock()
        notification_service.send_email.return_value = EmailDeliveryResult(
            message_id="message-123",
            provider_response={"MessageId": "message-123"},
        )

        notify_weekly_summary_for_garden(
            self.garden,
            notification_service=notification_service,
        )

        kwargs = notification_service.send_email.call_args.kwargs
        self.assertEqual(kwargs["recipients"], ["admin@example.com"])

    def test_deduplicates_admin_who_also_owns_plot(self):
        user = create_user(
            username="admin-steward",
            email="admin-steward@example.com",
        )
        plot = create_plot(garden=self.garden, plot_number="2")
        create_membership(
            garden=self.garden,
            user=user,
            role="admin",
            status="active",
        )
        plot.owners.add(user, through_defaults={"end_date": None})

        notification_service = Mock()
        notification_service.send_email.return_value = EmailDeliveryResult(
            message_id="message-123",
            provider_response={"MessageId": "message-123"},
        )

        notify_weekly_summary_for_garden(
            self.garden,
            notification_service=notification_service,
        )

        kwargs = notification_service.send_email.call_args.kwargs
        self.assertEqual(kwargs["recipients"], ["admin-steward@example.com"])

    def test_excludes_inactive_plot_ownership_and_inactive_admin(self):
        plot_owner = create_user(
            username="former-steward",
            email="former-steward@example.com",
        )
        inactive_admin = create_user(
            username="inactive-admin",
            email="inactive-admin@example.com",
        )
        plot = create_plot(garden=self.garden, plot_number="3")

        create_membership(
            garden=self.garden,
            user=inactive_admin,
            role="admin",
            status="inactive",
        )
        create_membership(
            garden=self.garden,
            user=plot_owner,
            role="community_volunteer",
            status="active",
        )

        plot.owners.add(plot_owner, through_defaults={"end_date": None})
        plot.ownerships.filter(user=plot_owner).update(end_date=date(2026, 1, 1))

        notification_service = Mock()
        notification_service.send_email.return_value = EmailDeliveryResult(
            message_id=None,
            provider_response={"skipped": True, "reason": "no_recipients"},
        )

        notify_weekly_summary_for_garden(
            self.garden,
            notification_service=notification_service,
        )

        kwargs = notification_service.send_email.call_args.kwargs
        self.assertEqual(kwargs["recipients"], [])

    def test_excludes_other_garden_and_missing_email(self):
        other_garden = create_garden(name="Garden B")
        other_user = create_user(
            username="other-garden",
            email="other-garden@example.com",
        )
        no_email_user = create_user(
            username="no-email",
            email="temp@example.com",
        )
        no_email_user.email = ""
        no_email_user.save(update_fields=["email"])

        other_plot = create_plot(garden=other_garden, plot_number="4")
        other_plot.owners.add(other_user, through_defaults={"end_date": None})
        create_membership(
            garden=other_garden,
            user=other_user,
            role="admin",
            status="active",
        )
        create_membership(
            garden=self.garden,
            user=no_email_user,
            role="admin",
            status="active",
        )

        notification_service = Mock()
        notification_service.send_email.return_value = EmailDeliveryResult(
            message_id=None,
            provider_response={"skipped": True, "reason": "no_recipients"},
        )

        notify_weekly_summary_for_garden(
            self.garden,
            notification_service=notification_service,
        )

        kwargs = notification_service.send_email.call_args.kwargs
        self.assertEqual(kwargs["recipients"], [])


@override_settings(NOTIFICATIONS_WEBHOOK_TOKEN="test-webhook-token")
class WeeklySummaryWebhookViewTests(APITestCase):
    def setUp(self):
        self.garden = create_garden(name="Garden A")
        self.url = reverse("notifications-weekly-summary")

    def post_webhook(self, payload=None, token=None):
        headers = {}
        if token is not None:
            headers["HTTP_X_INTERNAL_WEBHOOK_TOKEN"] = token
        return self.client.post(
            self.url,
            payload or {},
            format="json",
            **headers,
        )

    def test_rejects_missing_webhook_token(self):
        response = self.post_webhook({"garden_id": self.garden.id})

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_rejects_missing_garden_id(self):
        response = self.post_webhook(token="test-webhook-token")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("garden_id", response.data)

    def test_rejects_unknown_garden_id(self):
        response = self.post_webhook(
            {"garden_id": 999999},
            token="test-webhook-token",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("garden_id", response.data)

    @patch("notifications.views.notify_weekly_summary_for_garden")
    def test_posts_to_weekly_summary_service(self, mock_notify):
        mock_notify.return_value = Mock(message_id="message-123")

        response = self.post_webhook(
            {"garden_id": self.garden.id},
            token="test-webhook-token",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["garden_id"], self.garden.id)
        self.assertEqual(
            response.data["detail"],
            "Weekly summary notification sent.",
        )
        mock_notify.assert_called_once()
        self.assertEqual(
            mock_notify.call_args.args[0].pk,
            self.garden.id,
        )