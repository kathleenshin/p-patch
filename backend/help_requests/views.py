from rest_framework import permissions, viewsets

from .models import HelpRequest
from .serializers import HelpRequestSerializer


class HelpRequestViewSet(viewsets.ModelViewSet):
    queryset = HelpRequest.objects.select_related("garden", "plot", "created_by", "assigned_to").all()
    serializer_class = HelpRequestSerializer
    permission_classes = [permissions.AllowAny]

    def perform_create(self, serializer):
        if self.request.user.is_authenticated:
            serializer.save(created_by=self.request.user)
        else:
            serializer.save()
