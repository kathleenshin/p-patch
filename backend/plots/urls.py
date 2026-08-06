from django.urls import path

from .views import (
    PlotDetailView,
    PlotListCreateView,
    PlotNoteDetailView,
    PlotNoteListCreateView,
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
]