from django.conf import settings
from django.db import models


class Plot(models.Model):
    plot_number = models.PositiveIntegerField(unique=True)
    is_active = models.BooleanField(default=True) # False = plot is unavailable for use.

    def __str__(self):
        return f"Plot {self.plot_number}"


class PlotOwner(models.Model):
    # Reference the project's configured User model instead of hardcoding one.
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="plot_ownerships",
    )

    plot = models.ForeignKey(
        Plot,
        on_delete=models.CASCADE,
        related_name="ownerships",
    )

    # TODO Discuss whether we want to keep a history of plot ownerships
    start_date = models.DateField()
    end_date = models.DateField(null=True, blank=True) # null means ownership is current

    def __str__(self):
        return f"{self.user.username} - Plot {self.plot.plot_number}"
    

class PlotNote(models.Model):
    class Visibility(models.TextChoices):
        PRIVATE = "private", "Private"
        PUBLIC = "public", "Public"

    plot = models.ForeignKey(
        Plot,
        on_delete=models.CASCADE, # if plot is deleted, notes are also deleted
        related_name="notes",
    )

    # MVP: only the current plot owner can write notes on their plot (enforced in views/permissions)
    # TODO: discuss expanding to allow other users (e.g. staff, volunteers) to leave brief notes on others' plots
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="plot_notes",
    )

    body = models.TextField()

    visibility = models.CharField(
        max_length=10,
        choices=Visibility.choices,
        default=Visibility.PRIVATE,
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Note by {self.author.username} on Plot {self.plot.plot_number}"
    