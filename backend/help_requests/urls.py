from django.urls import path

from .views import HelpRequestAssigneeListView, HelpRequestViewSet


urlpatterns = [
    path(
        "assignees/",
        HelpRequestAssigneeListView.as_view(),
        name="help-request-assignees",
    ),
    path(
        "",
        HelpRequestViewSet.as_view(
            {
                "get": "list",
                "post": "create",
            }
        ),
        name="help-request-list",
    ),
    path(
        "<int:pk>/",
        HelpRequestViewSet.as_view(
            {
                "get": "retrieve",
                "patch": "partial_update",
                "delete": "destroy",
            }
        ),
        name="help-request-detail",
    ),
    path(
        "<int:pk>/claim/",
        HelpRequestViewSet.as_view(
            {
                "post": "claim",
            }
        ),
        name="help-request-claim",
    ),
    path(
        "<int:pk>/unclaim/",
        HelpRequestViewSet.as_view(
            {
                "post": "unclaim",
            }
        ),
        name="help-request-unclaim",
    ),
    path(
        "<int:pk>/complete/",
        HelpRequestViewSet.as_view(
            {
                "post": "complete",
            }
        ),
        name="help-request-complete",
    ),
]