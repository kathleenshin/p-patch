import logging
from datetime import timedelta

from django.db.models import Q
from django.utils import timezone
from rest_framework import generics, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from notifications.services.email_provider import EmailDeliveryError
from notifications.services.recipients import get_active_garden_member_emails
from notifications.services.task_notifications import (
    notify_new_help_request,
    notify_urgent_help_request,
)
from users.models import User
from users.permissions import IsApproved, IsGardenAdmin

from .models import HelpRequest
from .serializers import HelpRequestAssigneeSerializer, HelpRequestSerializer


logger = logging.getLogger(__name__)


class HelpRequestAssigneeListView(generics.ListAPIView):
    permission_classes = [IsApproved]
    serializer_class = HelpRequestAssigneeSerializer

    def get_queryset(self):
        return User.objects.filter(is_approved=True).order_by("email")


class HelpRequestViewSet(viewsets.ModelViewSet):
    serializer_class = HelpRequestSerializer
    permission_classes = [IsApproved]

    def get_queryset(self):
        # Keep claimed tasks; only show unclaimed ones from the last 14 days.
        cutoff = timezone.now() - timedelta(days=14)
        claimed_requests = Q(assigned_to__isnull=False)
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
            ).filter(claimed_requests | recent_unclaimed_requests)
        )

    def get_permissions(self):
        # Resend claim is garden-admin only; other actions use permission_classes.
        if self.action == "resend_claim":
            return [IsGardenAdmin()]
        return super().get_permissions()

    def perform_create(self, serializer):
        if self.request.user.is_authenticated:
            help_request = serializer.save(created_by=self.request.user)
        else:
            help_request = serializer.save()

        # Email every active garden member; never block create on mail failure.
        try:
            notify_new_help_request(help_request)
        except EmailDeliveryError:
            logger.exception(
                "Failed to send new help request notification %s",
                help_request.pk,
            )

        # HIGH also pings stewards/admins (narrower list than "everybody").
        if help_request.priority == HelpRequest.Priority.HIGH:
            try:
                notify_urgent_help_request(help_request)
            except EmailDeliveryError:
                logger.exception(
                    "Failed to send urgent help request notification %s",
                    help_request.pk,
                )

    @action(detail=True, methods=["post"], url_path="resend-claim")
    def resend_claim(self, request, pk=None):
        """Re-send claim email (all members); HIGH also re-sends urgent."""
        help_request = self.get_object()
        if help_request.assigned_to_id is not None:
            return Response(
                {"detail": "Help request already has an assignee."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if help_request.status == HelpRequest.Status.DONE:
            return Response(
                {"detail": "Cannot resend claim email for a completed request."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Address count for the garden-wide claim email (not send_mail's 0/1).
        recipient_count = len(get_active_garden_member_emails(help_request.garden))
        try:
            notify_new_help_request(help_request)
        except EmailDeliveryError:
            logger.exception(
                "Failed to resend claim email for help request %s",
                help_request.pk,
            )
            return Response(
                {"detail": "Failed to send claim email."},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        if help_request.priority == HelpRequest.Priority.HIGH:
            try:
                notify_urgent_help_request(help_request)
            except EmailDeliveryError:
                logger.exception(
                    "Failed to resend urgent help request notification %s",
                    help_request.pk,
                )
                return Response(
                    {
                        "detail": "Claim email resent, but urgent notification failed.",
                        "recipients": recipient_count,
                    },
                    status=status.HTTP_502_BAD_GATEWAY,
                )

        return Response(
            {"detail": "Claim email resent.", "recipients": recipient_count},
        )
