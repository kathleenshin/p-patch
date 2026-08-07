from rest_framework import serializers

from help_requests.models import HelpRequest

from .models import Plot, PlotNote


class PlotSerializer(serializers.ModelSerializer):
    garden_name = serializers.CharField(
        source="garden.name",
        read_only=True,
    )
    owners = serializers.SerializerMethodField()
    has_open_help_request = serializers.SerializerMethodField()
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
            "is_mine",
        ]
        read_only_fields = [
            "id",
            "garden_name",
            "owners",
            "has_open_help_request",
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