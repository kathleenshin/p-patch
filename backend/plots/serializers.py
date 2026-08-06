from rest_framework import serializers

from .models import Plot


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