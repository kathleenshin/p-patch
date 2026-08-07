from rest_framework import serializers

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

    def get_owners(self, plot):
        """Return active plot stewards for approved users."""

        request = self.context.get("request")

        # Pending/unapproved users should not receive owner identities
        if not request or not request.user.is_authenticated:
            return []

        if not request.user.is_approved:
            return []

        active_ownerships = (
            plot.ownerships
            .filter(end_date__isnull=True)
            .select_related("user")
        )

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

        return plot.help_requests.exclude(
            status="done",
        ).exists()

    def get_is_mine(self, plot):
        """Return whether the current user actively stewards this plot."""

        request = self.context.get("request")

        if not request or not request.user.is_authenticated:
            return False

        return plot.ownerships.filter(
            user=request.user,
            end_date__isnull=True,
        ).exists()


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