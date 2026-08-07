from rest_framework import permissions, viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response

from notifications.services.task_notifications import notify_new_help_request
from users.permissions import IsGardenAdmin
from rest_framework import generics, permissions, viewsets

from .models import HelpRequest
from .serializers import HelpRequestAssigneeSerializer, HelpRequestSerializer
from users.models import User
from users.permissions import IsApproved


class HelpRequestAssigneeListView(generics.ListAPIView):
    permission_classes = [IsApproved]
    serializer_class = HelpRequestAssigneeSerializer

    def get_queryset(self):
        return User.objects.filter(is_approved=True).order_by("email")


class HelpRequestViewSet(viewsets.ModelViewSet):
    queryset = HelpRequest.objects.select_related("garden", "plot", "created_by", "assigned_to").all()
    serializer_class = HelpRequestSerializer
    # CRUD stays open for now; Phase 2 will switch this to IsApproved.
    permission_classes = [permissions.AllowAny]

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
        # Email active garden members when a new help request is posted.
        notify_new_help_request(help_request)

    @action(detail=True, methods=["post"], url_path="resend-claim")
    def resend_claim(self, request, pk=None):
        """Re-send the claim email for an unclaimed (no assignee, not done) request."""
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
        # Reuse the same notify helper as create.
        # notify returns address count (not Django send_mail's 0/1 message count).
        recipient_count = notify_new_help_request(help_request)
        return Response(
            {"detail": "Claim email resent.", "recipients": recipient_count},
        )
