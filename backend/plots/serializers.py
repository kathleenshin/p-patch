from rest_framework import serializers

from .models import Plot, PlotNote


class PlotSerializer(serializers.ModelSerializer):
    class Meta:
        model = Plot
        fields = [
            "id",
            "garden",
            "plot_number",
            "is_active",
        ]
        read_only_fields = ["id"]


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