from rest_framework import generics

from .models import Plot
from .serializers import PlotSerializer


class PlotListCreateView(generics.ListCreateAPIView):
    queryset = Plot.objects.select_related("garden").all()
    serializer_class = PlotSerializer


class PlotDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Plot.objects.select_related("garden").all()
    serializer_class = PlotSerializer