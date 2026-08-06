from rest_framework import generics

from .models import Plot
from .serializers import PlotSerializer

# TODO: Add garden-level authorization once the shared permissions
# implementation is finalized. For now, these endpoints rely on the
# project's global authentication settings.
class PlotListCreateView(generics.ListCreateAPIView):
    queryset = Plot.objects.select_related("garden").all()
    serializer_class = PlotSerializer


class PlotDetailView(generics.RetrieveUpdateAPIView):
    queryset = Plot.objects.select_related("garden").all()
    serializer_class = PlotSerializer