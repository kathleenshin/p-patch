from django.urls import path

from .views import HelpRequestViewSet

urlpatterns = [
    path("", HelpRequestViewSet.as_view({"get": "list", "post": "create"}), name="help-request-list"),
    path("<int:pk>/", HelpRequestViewSet.as_view({"get": "retrieve", "patch": "partial_update", "delete": "destroy"}), name="help-request-detail"),
]
