from django.urls import path

from . import views


urlpatterns = [
    path("", views.WeatherForecastView.as_view(), name="weather-forecast"),
]