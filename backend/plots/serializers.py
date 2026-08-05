from rest_framework import serializers

from .models import Plot, PlotNote, PlotOwnership


class OwnerSerializer(serializers.Serializer):
    """Shape for an active plot owner (used when the viewer may see identity)."""

    id = serializers.IntegerField()
    email = serializers.EmailField()
    first_name = serializers.CharField()
    last_name = serializers.CharField()
    is_primary = serializers.BooleanField()


class PlotSerializer(serializers.ModelSerializer):
    """Plot list/detail. Pending users get an empty owners list."""

    owners = serializers.SerializerMethodField()
    garden_name = serializers.CharField(source="garden.name", read_only=True)

    class Meta:
        model = Plot
        fields = ("id", "garden", "garden_name", "plot_number", "is_active", "owners")

    def get_owners(self, plot):
        request = self.context.get("request")
        user = getattr(request, "user", None)
        # Pending-safe: omit owner identity until the user is approved.
        if not user or not user.is_authenticated:
            return []
        if not (user.is_approved or user.is_garden_admin):
            return []

        ownerships = (
            PlotOwnership.objects.filter(plot=plot, end_date__isnull=True)
            .select_related("user")
        )
        return [
            {
                "id": o.user_id,
                "email": o.user.email,
                "first_name": o.user.first_name,
                "last_name": o.user.last_name,
                "is_primary": o.is_primary,
            }
            for o in ownerships
        ]


class PlotNoteSerializer(serializers.ModelSerializer):
    """Create/list notes. plot and author are set by the view, not the client."""

    author_email = serializers.EmailField(source="author.email", read_only=True)
    author_name = serializers.SerializerMethodField()

    class Meta:
        model = PlotNote
        fields = (
            "id",
            "plot",
            "author",
            "author_email",
            "author_name",
            "content",
            "visibility",
            "created_at",
        )
        read_only_fields = ("id", "author", "created_at", "plot")

    def get_author_name(self, note):
        name = f"{note.author.first_name} {note.author.last_name}".strip()
        return name or note.author.email
