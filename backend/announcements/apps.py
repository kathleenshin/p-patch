from django.apps import AppConfig


class AnnouncementsConfig(AppConfig):
    # Community board posts for Dashboard (authored from Admin).
    default_auto_field = "django.db.models.BigAutoField"
    name = "announcements"
