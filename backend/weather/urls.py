from django.urls import path

from . import views


urlpatterns = [
    path("", views.weather_forecast, name="weather-forecast"),
]