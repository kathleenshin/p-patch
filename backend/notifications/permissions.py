from secrets import compare_digest

from django.conf import settings
from rest_framework.permissions import BasePermission


class HasWebhookToken(BasePermission):
    header_name = "X-Internal-Webhook-Token"

    def has_permission(self, request, view):
        expected_token = settings.NOTIFICATIONS_WEBHOOK_TOKEN

        if not expected_token:
            return False

        provided_token = request.headers.get(self.header_name, "")

        return compare_digest(provided_token, expected_token)