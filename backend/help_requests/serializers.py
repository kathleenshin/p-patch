from django.contrib.auth import get_user_model
from django.db.models import Q
from rest_framework import serializers

from .models import HelpRequest

User = get_user_model()


class HelpRequestSerializer(serializers.ModelSerializer):
    """Task/help-request payload. Assign by email/name via write-only `assignee`."""

    created_by_email = serializers.EmailField(source="created_by.email", read_only=True)
    assigned_to_email = serializers.EmailField(
        source="assigned_to.email", read_only=True, allow_null=True
    )
    assigned_to_name = serializers.SerializerMethodField()
    # Client sends email or "First Last"; resolved to assigned_to on create only.
    assignee = serializers.CharField(write_only=True, required=False, allow_blank=True)

    class Meta:
        model = HelpRequest
        fields = (
            "id",
            "title",
            "description",
            "status",
            "priority",
            "category",
            "garden",
            "plot",
            "created_by",
            "created_by_email",
            "assigned_to",
            "assigned_to_email",
            "assigned_to_name",
            "assignee",
            "created_at",
            "due_date",
            "completed_at",
        )
        read_only_fields = (
            "id",
            "created_by",
            "assigned_to",
            "created_at",
            "completed_at",
        )

    def get_assigned_to_name(self, obj):
        if not obj.assigned_to:
            return None
        name = f"{obj.assigned_to.first_name} {obj.assigned_to.last_name}".strip()
        return name or obj.assigned_to.email

    def _resolve_assignee(self, raw: str):
        """Match assignee string to an approved user (email first, then name)."""
        raw = (raw or "").strip()
        if not raw:
            return None

        user = User.objects.filter(email__iexact=raw).first()
        if user:
            return user

        parts = raw.split()
        qs = User.objects.filter(is_approved=True)
        if len(parts) >= 2:
            user = qs.filter(
                first_name__iexact=parts[0],
                last_name__iexact=" ".join(parts[1:]),
            ).first()
            if user:
                return user

        user = qs.filter(
            Q(first_name__iexact=raw) | Q(last_name__iexact=raw)
        ).first()
        if not user:
            raise serializers.ValidationError(
                {"assignee": f"No approved user matched '{raw}'."}
            )
        return user

    def validate(self, attrs):
        # Plot must belong to the same garden when both are present.
        garden = attrs.get("garden", getattr(self.instance, "garden", None))
        plot = attrs.get("plot", getattr(self.instance, "plot", None))
        if plot is not None and garden is not None and plot.garden_id != garden.id:
            raise serializers.ValidationError(
                {"plot": "Plot must belong to the selected garden."}
            )
        return attrs

    def create(self, validated_data):
        assignee_raw = validated_data.pop("assignee", "")
        # created_by may already be set by the view's perform_create.
        validated_data.setdefault("created_by", self.context["request"].user)
        validated_data["assigned_to"] = self._resolve_assignee(assignee_raw)
        return super().create(validated_data)

    def update(self, instance, validated_data):
        # Reassignment goes through POST .../assign/, not PATCH.
        validated_data.pop("assignee", None)
        return super().update(instance, validated_data)


class AssignHelpRequestSerializer(serializers.Serializer):
    """Body for POST /api/help-requests/<id>/assign/."""

    assignee = serializers.CharField()

    def save(self, **kwargs):
        help_request = self.context["help_request"]
        resolver = HelpRequestSerializer(context=self.context)
        help_request.assigned_to = resolver._resolve_assignee(
            self.validated_data["assignee"]
        )
        help_request.save(update_fields=["assigned_to"])
        return help_request
