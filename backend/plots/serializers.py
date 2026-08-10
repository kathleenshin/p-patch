from django.contrib.auth import get_user_model
from rest_framework import serializers

from help_requests.models import HelpRequest

from .models import Plot, PlotNote, PlotPhoto

User = get_user_model()


class PlotAssignSerializer(serializers.Serializer):
    """Garden-admin body for assigning a primary steward to a plot.

    Plot↔user is stored only on PlotOwnership (not a field on User).
    """

    # Approved member who will become the plot's primary steward.
    user_id = serializers.IntegerField()

    def validate_user_id(self, user_id):
        # Resolve once here so the view can reuse the User instance.
        try:
            user = User.objects.get(pk=user_id)
        except User.DoesNotExist as exc:
            raise serializers.ValidationError("User not found.") from exc

        # Pending registrations must be approved before receiving a plot.
        if not user.is_approved:
            raise serializers.ValidationError(
                "Only approved members can be assigned as plot stewards."
            )

        # Stash for PlotAssignView — avoids a second User.objects.get.
        self.context["assignee"] = user
        return user_id


class PlotSerializer(serializers.ModelSerializer):
    garden_name = serializers.CharField(
        source="garden.name",
        read_only=True,
    )
    owners = serializers.SerializerMethodField()
    has_open_help_request = serializers.SerializerMethodField()
    help_status = serializers.SerializerMethodField()
    is_mine = serializers.SerializerMethodField()

    class Meta:
        model = Plot
        fields = [
            "id",
            "garden",
            "garden_name",
            "plot_number",
            "is_active",
            "owners",
            "has_open_help_request",
            "help_status",
            "is_mine",
        ]
        read_only_fields = [
            "id",
            "garden_name",
            "owners",
            "has_open_help_request",
            "help_status",
            "is_mine",
        ]

    def _get_related_items(self, obj, related_name):
        """Return prefetched related objects when available."""

        prefetched = getattr(obj, "_prefetched_objects_cache", {})
        if related_name in prefetched:
            return prefetched[related_name]
        return list(getattr(obj, related_name).all())

    def get_owners(self, plot):
        """Return active plot stewards for approved users."""

        request = self.context.get("request")

        # Pending/unapproved users should not receive owner identities
        if not request or not request.user.is_authenticated:
            return []

        if not request.user.is_approved:
            return []

        ownerships = self._get_related_items(plot, "ownerships")
        active_ownerships = [
            ownership
            for ownership in ownerships
            if ownership.end_date is None
        ]

        return [
            {
                "id": ownership.user.id,
                "name": (
                    ownership.user.get_full_name().strip()
                    or ownership.user.username
                ),
                "is_primary": ownership.is_primary,
                "start_date": ownership.start_date,
            }
            for ownership in active_ownerships
        ]

    def get_has_open_help_request(self, plot):
        """Return whether the plot has an unfinished help request."""

        help_requests = self._get_related_items(plot, "help_requests")
        return any(
            help_request.status != HelpRequest.Status.DONE
            for help_request in help_requests
        )

    def get_help_status(self, plot):
        """Return the highest-priority open help status for the plot."""

        help_requests = self._get_related_items(plot, "help_requests")

        has_active = any(
            help_request.status == HelpRequest.Status.ACTIVE
            for help_request in help_requests
        )
        if has_active:
            return HelpRequest.Status.ACTIVE

        has_pending = any(
            help_request.status == HelpRequest.Status.PENDING
            for help_request in help_requests
        )
        if has_pending:
            return HelpRequest.Status.PENDING

        return None

    def get_is_mine(self, plot):
        """Return whether the current user actively stewards this plot."""

        request = self.context.get("request")

        if not request or not request.user.is_authenticated:
            return False

        user_id = request.user.id
        ownerships = self._get_related_items(plot, "ownerships")
        return any(
            ownership.user_id == user_id and ownership.end_date is None
            for ownership in ownerships
        )


class PlotNoteSerializer(serializers.ModelSerializer):
    author = serializers.StringRelatedField(read_only=True)

    class Meta:
        model = PlotNote
        fields = [
            "id",
            "plot",
            "author",
            "content",
            "visibility",
            "created_at",
        ]
        read_only_fields = [
            "id",
            "author",
            "created_at",
        ]

    def validate(self, attrs):
        request = self.context.get("request")
        plot = attrs.get("plot")

        if not request or not getattr(request.user, "is_authenticated", False):
            return attrs

        if plot is None:
            return attrs

        user = request.user
        has_active_ownership = plot.ownerships.filter(
            user=user,
            end_date__isnull=True,
        ).exists()

        if not has_active_ownership:
            raise serializers.ValidationError(
                {"plot": "You must be an active steward of this plot to create a note."}
            )

        return attrs


class PlotPhotoSerializer(serializers.ModelSerializer):
    """
    Multipart upload serializer for plot pictures.

    Clients POST multipart/form-data with `plot`, `image`, and optional `caption`.
    `image_url` is a local /media/... URL or an S3 URL depending on USE_S3.
    """

    uploaded_by = serializers.StringRelatedField(read_only=True)
    image_url = serializers.SerializerMethodField()

    class Meta:
        model = PlotPhoto
        fields = [
            "id",
            "plot",
            "uploaded_by",
            "image",
            "image_url",
            "caption",
            "created_at",
        ]
        read_only_fields = [
            "id",
            "uploaded_by",
            "image_url",
            "created_at",
        ]

    def get_image_url(self, photo):
        """Return the storage-backed URL for the uploaded image."""

        if not photo.image:
            return None

        request = self.context.get("request")
        url = photo.image.url

        # Local FileSystemStorage URLs are relative; make them absolute for the SPA.
        if request is not None and url.startswith("/"):
            return request.build_absolute_uri(url)

        return url
