from django.urls import path

from .views import AnnouncementListCreateView

# Mounted at /api/announcements/ in config/urls.py.
urlpatterns = [
    path("", AnnouncementListCreateView.as_view(), name="announcement-list-create"),
]
