from rest_framework import serializers

from plots.models import Garden, Plot
from users.models import User

from .models import HelpRequest


class HelpRequestSerializer(serializers.ModelSerializer):
    created_by = serializers.PrimaryKeyRelatedField(read_only=True)
    garden = serializers.PrimaryKeyRelatedField(queryset=Garden.objects.all())
    plot = serializers.PrimaryKeyRelatedField(
        queryset=Plot.objects.all(),
        required=False,
        allow_null=True,
    )
    assigned_to = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(),
        required=False,
        allow_null=True,
    )

    class Meta:
        model = HelpRequest
        fields = [
            "id",
            "title",
            "description",
            "status",
            "priority",
            "category",
            "garden",
            "plot",
            "created_by",
            "assigned_to",
            "created_at",
            "due_date",
            "completed_at",
        ]
        read_only_fields = ["id", "created_by", "created_at"]

    def create(self, validated_data):
        if self.context["request"].user.is_authenticated:
            validated_data["created_by"] = self.context["request"].user
        return super().create(validated_data)
