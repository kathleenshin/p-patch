from django.http import JsonResponse
from django.shortcuts import get_object_or_404

from plots.models import Garden

from .services.open_meteo import OpenMeteoService, WeatherServiceError


# Weather forecasts are retrieved for the garden's location rather than
# the retrieving user's location.
def weather_forecast(request):
    garden_id = request.GET.get("garden_id")

    if not garden_id:
        return JsonResponse(
            {"detail": "Query parameter garden_id is required."},
            status=400,
        )

    try:
        garden_id = int(garden_id)
    except (ValueError, TypeError):
        return JsonResponse(
            {"detail": "garden_id must be an integer."},
            status=400,
        )

    garden = get_object_or_404(Garden, pk=garden_id)

<<<<<<< HEAD
    # Forecasts cannot be retrieved until a garden has been geocoded.
=======
>>>>>>> main
    if garden.latitude is None or garden.longitude is None:
        return JsonResponse(
            {"detail": "Garden does not have coordinates."},
            status=400,
        )

    try:
        data = OpenMeteoService.get_forecast(
            latitude=float(garden.latitude),
            longitude=float(garden.longitude),
        )
    # Translate weather service failures into an HTTP 502 response "Bad Gateway"
    except WeatherServiceError as exc:
        return JsonResponse(
            {"detail": str(exc)},
            status=502,
        )

    return JsonResponse(data)