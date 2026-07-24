from django.urls import path

from . import views


urlpatterns = [
    path("", views.forecast, name="weather-forecast"),
]