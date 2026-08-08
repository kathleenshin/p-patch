from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from plots.models import Garden

from .services.air_quality import AirQualityService, AirQualityServiceError
from .services.open_meteo import OpenMeteoService, WeatherServiceError


# Weather forecasts are retrieved for the garden's location rather than
# the retrieving user's location.
class WeatherForecastView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        garden_id = request.query_params.get("garden_id")

        if not garden_id:
            return Response(
                {"detail": "Query parameter garden_id is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            garden_id = int(garden_id)
        except (ValueError, TypeError):
            return Response(
                {"detail": "garden_id must be an integer."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        garden = get_object_or_404(Garden, pk=garden_id)

        if garden.latitude is None or garden.longitude is None:
            return Response(
                {"detail": "Garden does not have coordinates."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            data = OpenMeteoService.get_forecast(
                latitude=float(garden.latitude),
                longitude=float(garden.longitude),
            )
        # Translate weather service failures into an HTTP 502 response "Bad Gateway"
        except WeatherServiceError as exc:
            return Response(
                {"detail": str(exc)},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        try:
            data["air_quality"] = AirQualityService.get_current(
                latitude=float(garden.latitude),
                longitude=float(garden.longitude),
            )
        except AirQualityServiceError:
            data["air_quality"] = {
                "us_aqi": None,
                "label": "Unavailable",
            }

        return Response(data)