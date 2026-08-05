from django.shortcuts import get_object_or_404
from rest_framework import generics, permissions

from users.permissions import IsApproved, IsPlotOwnerOrGardenAdmin

from .models import Plot, PlotNote, PlotOwnership
from .serializers import PlotNoteSerializer, PlotSerializer


def plots_queryset():
    """Active plots with garden + ownerships prefetched for serializers."""
    return (
        Plot.objects.filter(is_active=True)
        .select_related("garden")
        .prefetch_related("ownerships__user")
        .order_by("plot_number")
    )


class PlotListView(generics.ListAPIView):
    """GET /api/plots/ — any authenticated user; pending omits owners in serializer."""

    serializer_class = PlotSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = plots_queryset()
        garden_id = self.request.query_params.get("garden")
        if garden_id is not None:
            qs = qs.filter(garden_id=garden_id)
        return qs


class PlotDetailView(generics.RetrieveAPIView):
    """GET /api/plots/<id>/ — same pending-safe owner rules as the list."""

    serializer_class = PlotSerializer
    permission_classes = [permissions.IsAuthenticated]
    lookup_field = "pk"

    def get_queryset(self):
        return plots_queryset()


class PlotNoteListCreateView(generics.ListCreateAPIView):
    """
    GET  /api/plots/<plot_id>/notes/ — approved members
    POST /api/plots/<plot_id>/notes/ — approved + active plot owner (or garden admin)
    """

    serializer_class = PlotNoteSerializer
    permission_classes = [IsApproved]

    def get_plot(self):
        return get_object_or_404(plots_queryset(), pk=self.kwargs["plot_id"])

    def get_queryset(self):
        plot = self.get_plot()
        user = self.request.user
        qs = (
            PlotNote.objects.filter(plot=plot)
            .select_related("author", "plot")
            .order_by("-created_at")
        )
        return self._visible_notes(qs, user, plot)

    def _visible_notes(self, qs, user, plot):
        """Hide this_plot notes from non-owners (admins see everything)."""
        if user.is_garden_admin:
            return qs

        is_owner = PlotOwnership.objects.filter(
            plot=plot,
            user=user,
            end_date__isnull=True,
        ).exists()

        if is_owner:
            return qs

        # Other members: exclude notes private to this plot's owners.
        return qs.exclude(visibility="this_plot")

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx["plot"] = self.get_plot()
        return ctx

    def get_permissions(self):
        # POST also requires object-level ownership via IsPlotOwnerOrGardenAdmin.
        if self.request.method == "POST":
            return [IsApproved(), IsPlotOwnerOrGardenAdmin()]
        return [IsApproved()]

    def create(self, request, *args, **kwargs):
        # 404 / ownership check before serializer validation.
        plot = self.get_plot()
        self.check_object_permissions(request, plot)
        return super().create(request, *args, **kwargs)

    def perform_create(self, serializer):
        plot = self.get_plot()
        self.check_object_permissions(self.request, plot)
        serializer.save(plot=plot, author=self.request.user)
