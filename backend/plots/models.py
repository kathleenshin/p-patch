from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models, transaction
from django.db.models import F, Q
from django.utils import timezone


class Garden(models.Model):
    name = models.CharField(max_length=150)

    description = models.TextField(blank=True)
    address = models.CharField(max_length=255, blank=True)
    city = models.CharField(max_length=50, blank=True)
    state = models.CharField(max_length=50, blank=True)
    zip_code = models.CharField(max_length=10, blank=True)

    # Store coordinates so the address does not need to be geocoded every time weather data is requested.
    latitude = models.DecimalField(
        max_digits=9,
        decimal_places=6,
        null=True,
        blank=True,
    )
    longitude = models.DecimalField(
        max_digits=9,
        decimal_places=6,
        null=True,
        blank=True,
    )

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name


# Join/relationship table between user and garden
class GardenMembership(models.Model):
    ROLE_CHOICES = [
        ("plot_steward", "Plot Steward"),
        ("community_volunteer", "Community Volunteer"),
        ("admin", "Admin"),
    ]

    STATUS_CHOICES = [
        ("pending", "Pending"),
        ("active", "Active"),
        ("inactive", "Inactive"),
    ]

    garden = models.ForeignKey(
        Garden,
        on_delete=models.CASCADE,
        related_name="memberships",
    )

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="garden_memberships",
    )

    # Describes how the user participates in this garden.
    role = models.CharField(
        max_length=30,
        choices=ROLE_CHOICES,
        default="community_volunteer",
    )

    # Controls whether the user is currently approved to access the garden.
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default="pending",
    )

    joined_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            # A user can only have one membership record per garden.
            models.UniqueConstraint(
                fields=["garden", "user"],
                name="unique_garden_membership",
            )
        ]

    def __str__(self):
        return (
            f"{self.user} - {self.garden} "
            f"({self.get_role_display()}, {self.get_status_display()})"
        )


class Plot(models.Model):
    garden = models.ForeignKey(
        Garden,
        on_delete=models.CASCADE,
        related_name="plots",
    )

    plot_number = models.CharField(max_length=20)

    # False means the plot is unavailable for use.
    is_active = models.BooleanField(default=True)

    # A plot can have multiple owners, and a user could potentially
    # help manage or be primary owner of more than one plot.
    owners = models.ManyToManyField(
        settings.AUTH_USER_MODEL,
        through="PlotOwnership",
        related_name="plots",
    )

    class Meta:
        constraints = [
            # Plot numbers must be unique within a garden.
            # Different gardens may still use the same plot numbers.
            models.UniqueConstraint(
                fields=["garden", "plot_number"],
                name="unique_plot_number_per_garden",
            )
        ]

    def __str__(self):
        return f"{self.garden.name} - Plot {self.plot_number}"


# Join/relationship table between user and plot
class PlotOwnership(models.Model):
    plot = models.ForeignKey(
        Plot,
        on_delete=models.CASCADE,
        related_name="ownerships",
    )

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="plot_ownerships",
    )

    # Identifies the main contact when a plot has multiple owners.
    is_primary = models.BooleanField(default=False)

    # Preserves a history of past plot ownership.
    start_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)

    class Meta:
        constraints = [
            # Prevents a user from having multiple active ownership records
            # for the same plot. Past ownership records are still allowed.
            models.UniqueConstraint(
                fields=["plot", "user"],
                condition=Q(end_date__isnull=True),
                name="unique_active_plot_ownership",
            ),

            # Each plot can have only one active primary owner.
            models.UniqueConstraint(
                fields=["plot"],
                condition=Q(
                    end_date__isnull=True,
                    is_primary=True,
                ),
                name="unique_active_primary_owner_per_plot",
            ),

            # If both dates are present, the end date cannot occur before the start date.
            models.CheckConstraint(
                condition=(
                    Q(end_date__isnull=True)
                    | Q(start_date__isnull=True)
                    | Q(end_date__gte=F("start_date"))
                ),
                name="plot_ownership_end_on_or_after_start",
            ),
        ]

    def ensure_garden_membership(self):
        """Ensure an active plot steward belongs to the plot's garden."""

        if self.end_date is not None:
            return

        membership, created = GardenMembership.objects.get_or_create(
            garden=self.plot.garden,
            user=self.user,
            defaults={
                "role": "plot_steward",
                "status": "active",
            },
        )

        # Preserve an existing role, such as admin or community volunteer,
        # but ensure the membership is active.
        if not created and membership.status != "active":
            membership.status = "active"
            membership.save(update_fields=["status"])

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        self.ensure_garden_membership()

    @classmethod
    def set_primary_contact(cls, plot, user):
        """Set an active ownership as the plot's primary contact."""

        # The transaction and row locks prevent two ownership records from
        # becoming the primary owner at the same time.
        with transaction.atomic():
            active_ownerships = cls.objects.select_for_update().filter(
                plot=plot,
                end_date__isnull=True,
            )

            target = active_ownerships.filter(user=user).first()

            if not target:
                raise ValidationError(
                    "User must be an active owner on this plot."
                )

            # Remove primary status from any other active owner.
            active_ownerships.exclude(pk=target.pk).filter(
                is_primary=True
            ).update(is_primary=False)

            # Set the selected owner as the primary contact.
            if not target.is_primary:
                target.is_primary = True
                target.save(update_fields=["is_primary"])

            return target

    def end_ownership(self, ended_on=None, promote_to_user=None):
        """End this ownership and reassign the primary contact if needed."""

        ended_on = ended_on or timezone.localdate()

        with transaction.atomic():
            ownership = type(self).objects.select_for_update().get(
                pk=self.pk
            )

            was_primary = ownership.is_primary

            # Mark this ownership as ended.
            ownership.end_date = ended_on
            ownership.is_primary = False
            ownership.save(update_fields=["end_date", "is_primary"])

            # No replacement is needed if this was not the primary owner.
            if not was_primary:
                return None

            remaining_active = (
                type(self)
                .objects.select_for_update()
                .filter(
                    plot=ownership.plot,
                    end_date__isnull=True,
                )
            )

            # An admin or service may explicitly select the replacement owner.
            if promote_to_user is not None:
                promoted = remaining_active.filter(
                    user=promote_to_user
                ).first()

                if not promoted:
                    raise ValidationError(
                        "Selected replacement is not an active steward of this plot."
                    )

            # Otherwise, promote the owner with the earliest start date.
            else:
                promoted = remaining_active.order_by(
                    F("start_date").asc(nulls_last=True),
                    "id",
                ).first()

            if promoted:
                remaining_active.exclude(pk=promoted.pk).filter(
                    is_primary=True
                ).update(is_primary=False)

                if not promoted.is_primary:
                    promoted.is_primary = True
                    promoted.save(update_fields=["is_primary"])

            return promoted

    def __str__(self):
        return f"{self.user} - {self.plot}"


# TODO: Fix the visibility wording; it may still be a little vague for UX.
class PlotNote(models.Model):
    VISIBILITY_CHOICES = [
        ("this_plot", "My Plot"),
        ("all_plots_in_garden", "All P-Patch Plot Stewards"),
        ("garden_members", "Everyone in the Garden"),
    ]

    plot = models.ForeignKey(
        Plot,
        on_delete=models.CASCADE,
        related_name="notes",
    )

    # MVP: Only the current plot owner can write notes on their plot.
    # To be enforced in the views or permissions layer.
    #
    # TODO: Discuss expanding this later to allow other users,
    # such as staff or volunteers, to leave brief notes on other plots.
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="plot_notes",
    )

    content = models.TextField()

    visibility = models.CharField(
        max_length=20,
        choices=VISIBILITY_CHOICES,
        default="this_plot",
    )

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        # Display the newest plot notes first by default.
        ordering = ["-created_at"]

    def __str__(self):
        return (
            f"Note by {self.author.username} "
            f"on Plot {self.plot.plot_number}"
        )


def plot_photo_upload_to(instance, filename):
    """
    Build a stable storage key for a plot photo.

    Local: media/plots/<plot_id>/<filename>
    S3 (with AWS_LOCATION=media): media/plots/<plot_id>/<filename>
    """
    return f"plots/{instance.plot_id}/{filename}"


class PlotPhoto(models.Model):
    """
    User-uploaded picture attached to a garden plot.

    ImageField uses Django's default storage (local media/ or S3 when USE_S3=True).
    """

    plot = models.ForeignKey(
        Plot,
        on_delete=models.CASCADE,
        related_name="photos",
    )

    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="plot_photos",
    )

    image = models.ImageField(upload_to=plot_photo_upload_to)

    caption = models.CharField(max_length=255, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"Photo for Plot {self.plot.plot_number} ({self.pk})"
