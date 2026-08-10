from django.urls import path

from .views import WeeklySummaryWebhookView


urlpatterns = [
    path(
        "weekly-summary/",
        WeeklySummaryWebhookView.as_view(),
        name="notifications-weekly-summary",
    ),
]