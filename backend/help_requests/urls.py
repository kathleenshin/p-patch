from django.urls import path

from .views import HelpRequestAssigneeListView, HelpRequestViewSet

urlpatterns = [
    path("assignees/", HelpRequestAssigneeListView.as_view(), name="help-request-assignees"),
    path("", HelpRequestViewSet.as_view({"get": "list", "post": "create"}), name="help-request-list"),
    path("<int:pk>/", HelpRequestViewSet.as_view({"get": "retrieve", "patch": "partial_update", "delete": "destroy"}), name="help-request-detail"),
]
