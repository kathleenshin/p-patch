from rest_framework import generics
from rest_framework.permissions import IsAuthenticated

from users.permissions import IsGardenAdmin

from .models import Announcement
from .serializers import AnnouncementSerializer


class AnnouncementListCreateView(generics.ListCreateAPIView):
    """
    GET  — any logged-in user (Dashboard Community board, including pending).
    POST — garden admins only (Admin compose form).
    Posts older than one month are purged before each list/create.
    """

    serializer_class = AnnouncementSerializer

    def get_permissions(self):
        # Create is garden-admin only; list is any authenticated user.
        if self.request.method == "POST":
            return [IsGardenAdmin()]
        return [IsAuthenticated()]

    def get_queryset(self):
        # Drop stale posts so the Community board never serves month-old news.
        Announcement.purge_expired()
        return Announcement.objects.select_related("author").all()

    def perform_create(self, serializer):
        # Author is always the garden admin making the request.
        Announcement.purge_expired()
        serializer.save(author=self.request.user)
