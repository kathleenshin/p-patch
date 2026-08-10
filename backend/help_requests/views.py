from rest_framework import generics, viewsets

from .models import HelpRequest
from .serializers import HelpRequestAssigneeSerializer, HelpRequestSerializer
from users.models import User
from users.permissions import IsApproved


class HelpRequestAssigneeListView(generics.ListAPIView):
    permission_classes = [IsApproved]
    serializer_class = HelpRequestAssigneeSerializer

    def get_queryset(self):
        return User.objects.filter(is_approved=True).order_by("email")


class HelpRequestViewSet(viewsets.ModelViewSet):
    queryset = HelpRequest.objects.select_related("garden", "plot", "created_by", "assigned_to").all()
    serializer_class = HelpRequestSerializer
    permission_classes = [IsApproved]

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)
