from django.urls import path

from .views import (
    PlotAssignView,
    PlotDetailView,
    PlotListCreateView,
    PlotNoteDetailView,
    PlotNoteListCreateView,
    PlotPhotoDetailView,
    PlotPhotoListCreateView,
)


urlpatterns = [
    path(
        "plots/",
        PlotListCreateView.as_view(),
        name="plot-list-create",
    ),
    path(
        "plots/<int:pk>/",
        PlotDetailView.as_view(),
        name="plot-detail",
    ),
    # Garden-admin: POST { "user_id": N } → primary PlotOwnership on an empty plot.
    path(
        "plots/<int:pk>/assign/",
        PlotAssignView.as_view(),
        name="plot-assign",
    ),
    path(
        "plot-notes/",
        PlotNoteListCreateView.as_view(),
        name="plot-note-list-create",
    ),
    path(
        "plot-notes/<int:pk>/",
        PlotNoteDetailView.as_view(),
        name="plot-note-detail",
    ),
    path(
        "plot-photos/",
        PlotPhotoListCreateView.as_view(),
        name="plot-photo-list-create",
    ),
    path(
        "plot-photos/<int:pk>/",
        PlotPhotoDetailView.as_view(),
        name="plot-photo-detail",
    ),
]
