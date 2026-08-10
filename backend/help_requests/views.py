import logging
from datetime import timedelta

from django.db.models import Q
from django.utils import timezone
from rest_framework import generics, permissions, viewsets
from rest_framework import generics, viewsets

from notifications.services.email_provider import EmailDeliveryError
from notifications.services.task_notifications import (
    notify_urgent_help_request,
)
from users.models import User
from users.permissions import IsApproved

from .models import HelpRequest
from .serializers import (
    HelpRequestAssigneeSerializer,
    HelpRequestSerializer,
)


logger = logging.getLogger(__name__)


class HelpRequestAssigneeListView(generics.ListAPIView):
    permission_classes = [IsApproved]
    serializer_class = HelpRequestAssigneeSerializer

    def get_queryset(self):
        return User.objects.filter(
            is_approved=True
        ).order_by("email")


class HelpRequestViewSet(viewsets.ModelViewSet):
    serializer_class = HelpRequestSerializer
    permission_classes = [IsApproved]

    def get_queryset(self):
        cutoff = timezone.now() - timedelta(days=14)

        claimed_requests = Q(
            assigned_to__isnull=False,
        )

        recent_unclaimed_requests = Q(
            assigned_to__isnull=True,
            created_at__gte=cutoff,
        )

        return (
            HelpRequest.objects.select_related(
                "garden",
                "plot",
                "created_by",
                "assigned_to",
            )
            .filter(
                claimed_requests
                | recent_unclaimed_requests
            )
        )

    def perform_create(self, serializer):
        help_request = serializer.save()

        if help_request.priority == HelpRequest.Priority.HIGH:
            try:
                notify_urgent_help_request(help_request)
            except EmailDeliveryError:
                # Log the error without preventing request creation.
                logger.exception(
                    "Failed to send urgent help request notification %s",
                    help_request.pk,
                )
        serializer.save(created_by=self.request.user)
