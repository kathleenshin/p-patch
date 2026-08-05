from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.views import APIView

from users.permissions import IsApproved

from .models import HelpRequest
from .serializers import AssignHelpRequestSerializer, HelpRequestSerializer


def help_requests_queryset():
    """Tasks with related users/garden/plot for list and detail responses."""
    return HelpRequest.objects.select_related(
        "created_by",
        "assigned_to",
        "garden",
        "plot",
    ).order_by("-created_at")


class HelpRequestListCreateView(generics.ListCreateAPIView):
    """
    GET  /api/help-requests/
         ?status=active|pending|done
         ?garden=<id>
         ?plot=<id>
         ?assigned_to=<user_id>
    POST /api/help-requests/
         { title, description, garden, plot?, status?, priority?, category?,
           due_date?, assignee? }
    """

    serializer_class = HelpRequestSerializer
    permission_classes = [IsApproved]

    def get_queryset(self):
        qs = help_requests_queryset()
        params = self.request.query_params

        status_filter = params.get("status")
        if status_filter:
            qs = qs.filter(status=status_filter)

        garden_id = params.get("garden")
        if garden_id is not None:
            qs = qs.filter(garden_id=garden_id)

        plot_id = params.get("plot")
        if plot_id is not None:
            qs = qs.filter(plot_id=plot_id)

        assigned_to = params.get("assigned_to")
        if assigned_to is not None:
            qs = qs.filter(assigned_to_id=assigned_to)

        return qs

    def perform_create(self, serializer):
        # Stamp the authenticated member as the creator.
        serializer.save(created_by=self.request.user)


class HelpRequestDetailView(generics.RetrieveUpdateAPIView):
    """
    GET   /api/help-requests/<id>/
    PATCH /api/help-requests/<id>/  (status, priority, etc. — use /assign/ for people)
    """

    serializer_class = HelpRequestSerializer
    permission_classes = [IsApproved]
    http_method_names = ["get", "patch", "head", "options"]

    def get_queryset(self):
        return help_requests_queryset()

    def perform_update(self, serializer):
        instance = serializer.instance
        new_status = serializer.validated_data.get("status", instance.status)

        # Track completion timestamp when moving into / out of done.
        extra = {}
        if (
            new_status == HelpRequest.Status.DONE
            and instance.status != HelpRequest.Status.DONE
        ):
            extra["completed_at"] = timezone.now()
        elif new_status != HelpRequest.Status.DONE:
            extra["completed_at"] = None

        serializer.save(**extra)


class HelpRequestAssignView(APIView):
    """
    POST /api/help-requests/<id>/assign/
    body: { "assignee": "email@x.com" } or { "assignee": "First Last" }
    """

    permission_classes = [IsApproved]

    def post(self, request, pk):
        help_request = get_object_or_404(help_requests_queryset(), pk=pk)
        serializer = AssignHelpRequestSerializer(
            data=request.data,
            context={"request": request, "help_request": help_request},
        )
        serializer.is_valid(raise_exception=True)
        help_request = serializer.save()
        return Response(
            HelpRequestSerializer(help_request, context={"request": request}).data,
            status=status.HTTP_200_OK,
        )
