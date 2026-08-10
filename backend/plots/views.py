from django.db.models import Prefetch, Q
from rest_framework import generics
from rest_framework.exceptions import ValidationError
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from django.db.models import Q

from .models import Plot, PlotNote, PlotPhoto, PlotOwnership
from .serializers import (
    PlotNoteSerializer,
    PlotPhotoSerializer,
    PlotSerializer,
)

plot_queryset = (
    Plot.objects
    .select_related("garden")
    .prefetch_related(
        Prefetch(
            "ownerships",
            queryset=PlotOwnership.objects.select_related("user"),
        ),
        "help_requests",
    )
)


# TODO: Add garden-level authorization once the shared permissions
# implementation is finalized. For now, these endpoints rely on the
# project's global authentication settings.

class PlotListCreateView(generics.ListCreateAPIView):
    queryset = plot_queryset
    serializer_class = PlotSerializer

    def get_queryset(self):
        return Plot.objects.select_related("garden").prefetch_related(
            Prefetch(
                "ownerships",
                queryset=PlotOwnership.objects.select_related("user"),
            ),
            "help_requests",
        )


# Does not support Delete for MVP

class PlotDetailView(generics.RetrieveUpdateAPIView):
    queryset = plot_queryset
    serializer_class = PlotSerializer

    def get_queryset(self):
        return Plot.objects.select_related("garden").prefetch_related(
            Prefetch(
                "ownerships",
                queryset=PlotOwnership.objects.select_related("user"),
            ),
            "help_requests",
        )


# TODO: Align PlotNote create, update, and delete permissions
# TODO: Integrate PlotNote role-based permissions from users/permissions.py.
# Intended rules:
# - active plot owner or garden admin may create a note
# - note author or garden admin may update or delete a note
# - unauthenticated users receive 401

class PlotNoteListCreateView(generics.ListCreateAPIView):
    serializer_class = PlotNoteSerializer

    def _validated_plot_id(self):
        raw_plot_id = self.request.query_params.get("plot")

        if raw_plot_id in (None, ""):
            raise ValidationError(
                {"plot": "This query parameter is required."}
            )

        try:
            return int(raw_plot_id)
        except (TypeError, ValueError):
            raise ValidationError(
                {"plot": "A numeric plot id is required."}
            )

    def _visible_queryset(self, queryset):
        user = self.request.user

        if user.is_garden_admin:
            return queryset

        return queryset.filter(
            Q(author=user)
            | Q(
                visibility="this_plot",
                plot__ownerships__user=user,
                plot__ownerships__end_date__isnull=True,
            )
            | Q(
                visibility="all_plots_in_garden",
                plot__garden__plots__ownerships__user=user,
                plot__garden__plots__ownerships__end_date__isnull=True,
            )
            | Q(
                visibility="garden_members",
                plot__garden__memberships__user=user,
                plot__garden__memberships__status="active",
            )
        ).distinct()

    def get_queryset(self):
        plot_id = self._validated_plot_id()

        queryset = PlotNote.objects.select_related(
            "plot",
            "plot__garden",
            "author",
        ).filter(plot_id=plot_id)

        return self._visible_queryset(queryset)

    def perform_create(self, serializer):
        serializer.save(author=self.request.user)


# TODO: Restrict updates and deletion to the note author or a garden admin
# once the shared permissions implementation is available.

class PlotNoteDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = PlotNoteSerializer

    def get_queryset(self):
        queryset = PlotNote.objects.select_related(
            "plot",
            "plot__garden",
            "author",
        ).all()

        user = self.request.user

        if user.is_garden_admin:
            return queryset

        return queryset.filter(
            Q(author=user)
            | Q(
                visibility="this_plot",
                plot__ownerships__user=user,
                plot__ownerships__end_date__isnull=True,
            )
            | Q(
                visibility="all_plots_in_garden",
                plot__garden__plots__ownerships__user=user,
                plot__garden__plots__ownerships__end_date__isnull=True,
            )
            | Q(
                visibility="garden_members",
                plot__garden__memberships__user=user,
                plot__garden__memberships__status="active",
            )
        ).distinct()


# TODO: Restrict photo create/delete to active plot stewards or garden admins.
class PlotPhotoListCreateView(generics.ListCreateAPIView):
    """
    List and upload plot photos.

    Uploads use multipart/form-data. The ImageField saves through Django's
    default storage (local media/ or S3 when USE_S3=True).
    """

    parser_classes = [MultiPartParser, FormParser, JSONParser]
    serializer_class = PlotPhotoSerializer

    def get_queryset(self):
        queryset = PlotPhoto.objects.select_related(
            "plot",
            "plot__garden",
            "uploaded_by",
        ).all()

        plot_id = self.request.query_params.get("plot")
        if plot_id:
            queryset = queryset.filter(plot_id=plot_id)

        return queryset

    def perform_create(self, serializer):
        serializer.save(uploaded_by=self.request.user)


class PlotPhotoDetailView(generics.RetrieveDestroyAPIView):
    """Retrieve or delete a single plot photo."""

    queryset = PlotPhoto.objects.select_related(
        "plot",
        "plot__garden",
        "uploaded_by",
    ).all()
    serializer_class = PlotPhotoSerializer

