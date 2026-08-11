import logging
from datetime import timedelta

from django.db import transaction
from django.db.models import Q
from django.utils import timezone
from rest_framework import generics, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from django.shortcuts import get_object_or_404

from notifications.services.email_provider import EmailDeliveryError
from notifications.services.recipients import (
    get_active_garden_member_emails,
)
from notifications.services.task_notifications import (
    notify_help_request_claimed,
    notify_new_help_request,
    notify_urgent_help_request,
)
from users.models import User
from users.permissions import IsApproved, IsGardenAdmin

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
        # Keep claimed in-progress tasks, keep completed tasks for 7 days,
        # and only show unclaimed ones from the last 14 days.
        unclaimed_cutoff = timezone.now() - timedelta(days=14)
        completed_cutoff = timezone.now() - timedelta(days=7)

        claimed_in_progress_requests = Q(
            assigned_to__isnull=False,
        ) & ~Q(status=HelpRequest.Status.DONE)

        recent_completed_requests = Q(
            status=HelpRequest.Status.DONE,
            completed_at__gte=completed_cutoff,
        ) | Q(
            status=HelpRequest.Status.DONE,
            completed_at__isnull=True,
        )

        recent_unclaimed_requests = Q(
            assigned_to__isnull=True,
            created_at__gte=unclaimed_cutoff,
        )

        return (
            HelpRequest.objects.select_related(
                "garden",
                "plot",
                "created_by",
                "assigned_to",
            )
            .filter(
                claimed_in_progress_requests
                | recent_completed_requests
                | recent_unclaimed_requests
            )
        )

    def get_permissions(self):
        # Resend claim is garden-admin only;
        # all other actions use permission_classes.
        if self.action == "resend_claim":
            return [IsGardenAdmin()]

        return super().get_permissions()

    def perform_create(self, serializer):
        help_request = serializer.save(
            created_by=self.request.user
        )

        if help_request.priority == HelpRequest.Priority.HIGH:
            try:
                notify_urgent_help_request(help_request)
            except EmailDeliveryError:
                logger.exception(
                    "Failed to send urgent help request notification %s",
                    help_request.pk,
                )
                
    def claim(self, request, pk=None):
        with transaction.atomic():
            help_request = get_object_or_404(
                HelpRequest.objects.select_for_update(),
                pk=pk,
            )

            if help_request.status == HelpRequest.Status.DONE:
                return Response(
                    {
                        "detail": (
                            "Completed help requests cannot be claimed."
                        )
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            if help_request.assigned_to is not None:
                return Response(
                    {
                        "detail": (
                            "This help request has already been claimed."
                        )
                    },
                    status=status.HTTP_409_CONFLICT,
                )

            help_request.assigned_to = request.user
            help_request.status = HelpRequest.Status.PENDING
            help_request.save(
                update_fields=[
                    "assigned_to",
                    "status",
                ]
            )

        try:
            notify_help_request_claimed(help_request)
        except EmailDeliveryError:
            logger.exception(
                "Failed to send claim notification for help request %s",
                help_request.pk,
            )

        return Response(
            self.get_serializer(help_request).data,
            status=status.HTTP_200_OK,
        )


    def unclaim(self, request, pk=None):
        help_request = self.get_object()

        if help_request.status == HelpRequest.Status.DONE:
            return Response(
                {
                    "detail": (
                        "Completed help requests cannot be unclaimed."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        if help_request.assigned_to_id is None:
            return Response(
                {
                    "detail": (
                        "This help request is not currently claimed."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        if (
            help_request.assigned_to_id != request.user.id
            and not request.user.is_garden_admin
        ):
            return Response(
                {
                    "detail": (
                        "You cannot unclaim this help request."
                    )
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        help_request.assigned_to = None
        help_request.status = HelpRequest.Status.ACTIVE
        help_request.save(
            update_fields=[
                "assigned_to",
                "status",
            ]
        )

        return Response(
            self.get_serializer(help_request).data,
            status=status.HTTP_200_OK,
        )
    
    def complete(self, request, pk=None):
        help_request = self.get_object()

        if help_request.assigned_to_id is None:
            return Response(
                {
                    "detail": (
                        "This help request must be claimed before "
                        "it can be completed."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        if (
            help_request.assigned_to_id != request.user.id
            and not request.user.is_garden_admin
        ):
            return Response(
                {
                    "detail": (
                        "You cannot complete this help request."
                    )
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        help_request.status = HelpRequest.Status.DONE
        help_request.completed_at = timezone.now()
        help_request.save(
            update_fields=[
                "status",
                "completed_at",
            ]
        )

        return Response(
            self.get_serializer(help_request).data,
            status=status.HTTP_200_OK,
        )

    @action(
        detail=True,
        methods=["post"],
        url_path="resend-claim",
    )
    def resend_claim(self, request, pk=None):
        """Re-send claim email; HIGH also re-sends urgent notification."""

        help_request = self.get_object()

        if help_request.assigned_to_id is not None:
            return Response(
                {
                    "detail": (
                        "Help request already has an assignee."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        if help_request.status == HelpRequest.Status.DONE:
            return Response(
                {
                    "detail": (
                        "Cannot resend claim email for "
                        "a completed request."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        recipient_count = len(
            get_active_garden_member_emails(
                help_request.garden
            )
        )

        try:
            notify_new_help_request(help_request)
        except EmailDeliveryError:
            logger.exception(
                "Failed to resend claim email for help request %s",
                help_request.pk,
            )

            return Response(
                {
                    "detail": (
                        "Failed to send claim email."
                    )
                },
                status=status.HTTP_502_BAD_GATEWAY,
            )

        if help_request.priority == HelpRequest.Priority.HIGH:
            try:
                notify_urgent_help_request(help_request)
            except EmailDeliveryError:
                logger.exception(
                    "Failed to resend urgent help request "
                    "notification %s",
                    help_request.pk,
                )

                return Response(
                    {
                        "detail": (
                            "Claim email resent, but urgent "
                            "notification failed."
                        ),
                        "recipients": recipient_count,
                    },
                    status=status.HTTP_502_BAD_GATEWAY,
                )

        return Response(
            {
                "detail": "Claim email resent.",
                "recipients": recipient_count,
            }
        )