from django.urls import path

from .views import PlotDetailView, PlotListCreateView


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
]