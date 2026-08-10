from django.urls import path

from .views import HelpRequestAssigneeListView, HelpRequestViewSet

# Explicit view bindings (needed so resend_claim can be a separate path).
list_create = HelpRequestViewSet.as_view({"get": "list", "post": "create"})
detail = HelpRequestViewSet.as_view(
    {"get": "retrieve", "patch": "partial_update", "delete": "destroy"}
)
# Garden-admin action: POST /api/help-requests/<id>/resend-claim/
resend_claim = HelpRequestViewSet.as_view({"post": "resend_claim"})

urlpatterns = [
    # Approved-user assignee picker for Task create/edit (still used by frontend + tests).
    path("assignees/", HelpRequestAssigneeListView.as_view(), name="help-request-assignees"),
    path("", list_create, name="help-request-list"),
    path("<int:pk>/", detail, name="help-request-detail"),
    path("<int:pk>/resend-claim/", resend_claim, name="help-request-resend-claim"),
]
