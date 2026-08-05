from django.urls import path

from .views import PlotDetailView, PlotListView, PlotNoteListCreateView

urlpatterns = [
    path("", PlotListView.as_view(), name="plot-list"),
    path("<int:pk>/", PlotDetailView.as_view(), name="plot-detail"),
    path(
        "<int:plot_id>/notes/",
        PlotNoteListCreateView.as_view(),
        name="plot-note-list-create",
    ),
]
