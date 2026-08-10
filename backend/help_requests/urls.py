from django.urls import path

from .views import HelpRequestAssigneeListView, HelpRequestViewSet


list_create = HelpRequestViewSet.as_view(
    {
        "get": "list",
        "post": "create",
    }
)

detail = HelpRequestViewSet.as_view(
    {
        "get": "retrieve",
        "patch": "partial_update",
        "delete": "destroy",
    }
)

claim = HelpRequestViewSet.as_view(
    {
        "post": "claim",
    }
)

unclaim = HelpRequestViewSet.as_view(
    {
        "post": "unclaim",
    }
)

complete = HelpRequestViewSet.as_view(
    {
        "post": "complete",
    }
)

resend_claim = HelpRequestViewSet.as_view(
    {
        "post": "resend_claim",
    }
)


urlpatterns = [
    path(
        "assignees/",
        HelpRequestAssigneeListView.as_view(),
        name="help-request-assignees",
    ),
    path(
        "",
        list_create,
        name="help-request-list",
    ),
    path(
        "<int:pk>/",
        detail,
        name="help-request-detail",
    ),
    path(
        "<int:pk>/claim/",
        claim,
        name="help-request-claim",
    ),
    path(
        "<int:pk>/unclaim/",
        unclaim,
        name="help-request-unclaim",
    ),
    path(
        "<int:pk>/complete/",
        complete,
        name="help-request-complete",
    ),
    path(
        "<int:pk>/resend-claim/",
        resend_claim,
        name="help-request-resend-claim",
    ),
]
