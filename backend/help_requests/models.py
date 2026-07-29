from django.db import models
from django.conf import settings


class HelpRequest(models.Model):
    class Status(models.TextChoices):
        ACTIVE = "active", "Active"
        PENDING = "pending", "Pending"
        DONE = "done", "Done"

    class Priority(models.TextChoices):
        LOW = "low", "Low"
        MEDIUM = "medium", "Medium"
        HIGH = "high", "High"

    class Category(models.TextChoices):
        MAINTENANCE = "maintenance", "Maintenance"
        WATERING = "watering", "Watering"
        CLEANUP = "cleanup", "Cleanup"
        GARDENING = "gardening", "Gardening"
        OTHER = "other", "Other"

    title = models.CharField(max_length=150)
    description = models.TextField()

    status = models.CharField(
        max_length=10,
        choices=Status.choices,
        default=Status.ACTIVE,
    )

    priority = models.CharField(
        max_length=10,
        choices=Priority.choices,
        default=Priority.MEDIUM,
    )

    category = models.CharField(
        max_length=20,
        choices=Category.choices,
        default=Category.OTHER,
    )

    garden = models.ForeignKey(
        "plots.Garden",
        on_delete=models.CASCADE,
        related_name="help_requests",
    )

    plot = models.ForeignKey(
        "plots.Plot",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="help_requests",
    )

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="help_requests_created",
    )

    assigned_to = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="help_requests_assigned",
    )

    created_at = models.DateTimeField(auto_now_add=True)
    due_date = models.DateField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return self.title