from rest_framework import generics

from .models import Plot, PlotNote
from .serializers import PlotNoteSerializer, PlotSerializer


# TODO: Add garden-level authorization once the shared permissions
# implementation is finalized. For now, these endpoints rely on the
# project's global authentication settings.
class PlotListCreateView(generics.ListCreateAPIView):
    queryset = (
        Plot.objects.select_related("garden")
        .prefetch_related(
            "ownerships__user",
            "help_requests",
        )
        .all()
    )
    serializer_class = PlotSerializer


# Does not support Delete for MVP
class PlotDetailView(generics.RetrieveUpdateAPIView):
    queryset = (
        Plot.objects.select_related("garden")
        .prefetch_related(
            "ownerships__user",
            "help_requests",
        )
        .all()
    )
    serializer_class = PlotSerializer


# TODO: Align PlotNote create, update, and delete permissions
# TODO: Integrate PlotNote role-based permissions from users/permissions.py.
# Intended rules:
# - active plot owner or garden admin may create a note
# - note author or garden admin may update or delete a note
# - unauthenticated users receive 401
class PlotNoteListCreateView(generics.ListCreateAPIView):
    serializer_class = PlotNoteSerializer

    def get_queryset(self):
        queryset = PlotNote.objects.select_related(
            "plot",
            "plot__garden",
            "author",
        ).all()

        plot_id = self.request.query_params.get("plot")

        if plot_id:
            queryset = queryset.filter(plot_id=plot_id)

        return queryset

    def perform_create(self, serializer):
        serializer.save(author=self.request.user)


# TODO: Restrict updates and deletion to the note author or a garden admin
# once the shared permissions implementation is available.
class PlotNoteDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = PlotNote.objects.select_related(
        "plot",
        "plot__garden",
        "author",
    ).all()
    serializer_class = PlotNoteSerializer