from rest_framework import generics, permissions, viewsets

from .models import HelpRequest
from .serializers import HelpRequestAssigneeSerializer, HelpRequestSerializer
from users.models import User
from users.permissions import IsApproved
from notifications.services.task_notifications import notify_urgent_help_request_created
from notifications.services.email_provider import EmailDeliveryError
import logging

logger = logging.getLogger(__name__)


class HelpRequestAssigneeListView(generics.ListAPIView):
    permission_classes = [IsApproved]
    serializer_class = HelpRequestAssigneeSerializer

    def get_queryset(self):
        return User.objects.filter(is_approved=True).order_by("email")


class HelpRequestViewSet(viewsets.ModelViewSet):
    queryset = HelpRequest.objects.select_related("garden", "plot", "created_by", "assigned_to").all()
    serializer_class = HelpRequestSerializer
    permission_classes = [permissions.AllowAny]

    def perform_create(self, serializer):
        if self.request.user.is_authenticated:
            help_request = serializer.save(created_by=self.request.user)
        else:
            help_request = serializer.save()

        if help_request.priority == HelpRequest.Priority.HIGH:
            try:
                notify_urgent_help_request_created(help_request)
            except EmailDeliveryError:
                logger.exception(
                    "Failed to send urgent help request notification %s",
                    help_request.pk,
                )