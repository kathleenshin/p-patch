from django.urls import path

from .views import (
    HelpRequestAssignView,
    HelpRequestDetailView,
    HelpRequestListCreateView,
)

urlpatterns = [
    path("", HelpRequestListCreateView.as_view(), name="help-request-list-create"),
    path("<int:pk>/", HelpRequestDetailView.as_view(), name="help-request-detail"),
    path(
        "<int:pk>/assign/",
        HelpRequestAssignView.as_view(),
        name="help-request-assign",
    ),
]
