from rest_framework import serializers

from plots.models import Garden


class WeeklySummaryRequestSerializer(serializers.Serializer):
    garden_id = serializers.PrimaryKeyRelatedField(
        queryset=Garden.objects.all(),
        source="garden",
    )