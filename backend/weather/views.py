from django.http import JsonResponse

from .services.open_meteo import OpenMeteoService


def forecast(request):
    service = OpenMeteoService()
    data = service.get_forecast()

    return JsonResponse(data)