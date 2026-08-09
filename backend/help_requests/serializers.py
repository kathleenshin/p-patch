from rest_framework import serializers

from plots.models import Garden, Plot
from users.models import User

from .models import HelpRequest


class HelpRequestSerializer(serializers.ModelSerializer):
    created_by = serializers.PrimaryKeyRelatedField(read_only=True)
    garden = serializers.PrimaryKeyRelatedField(queryset=Garden.objects.all())
    plot_number = serializers.CharField(
        required=False,
        allow_blank=True,
        write_only=True,
    )
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
            "plot_number",
            "plot",
            "created_by",
            "assigned_to",
            "created_at",
            "due_date",
            "completed_at",
        ]
        read_only_fields = ["id", "created_by", "created_at"]

    def validate(self, attrs):
        plot_number_raw = attrs.pop("plot_number", None)
        garden = attrs.get("garden")

        if not garden and self.instance is not None:
            garden = self.instance.garden

        if plot_number_raw is not None:
            plot_number = plot_number_raw.strip()

            if plot_number == "":
                attrs["plot"] = None
            else:
                if not garden:
                    raise serializers.ValidationError(
                        {"garden": "Garden is required when setting plot_number."}
                    )

                resolved_plot = Plot.objects.filter(
                    garden=garden,
                    plot_number=plot_number,
                ).first()

                if not resolved_plot:
                    raise serializers.ValidationError(
                        {
                            "plot_number": (
                                "No plot with this plot number exists in the selected garden."
                            )
                        }
                    )

                provided_plot = attrs.get("plot")
                if (
                    provided_plot is not None
                    and provided_plot.id != resolved_plot.id
                ):
                    raise serializers.ValidationError(
                        {
                            "plot": (
                                "plot and plot_number refer to different plots."
                            )
                        }
                    )

                attrs["plot"] = resolved_plot

        plot = attrs.get("plot")
        if plot is None and self.instance is not None and "plot" not in attrs:
            plot = self.instance.plot

        if plot is not None and garden is not None and plot.garden_id != garden.id:
            raise serializers.ValidationError(
                {
                    "plot": "Selected plot does not belong to the selected garden."
                }
            )

        return attrs

    def create(self, validated_data):
        if self.context["request"].user.is_authenticated:
            validated_data["created_by"] = self.context["request"].user
        return super().create(validated_data)


class HelpRequestAssigneeSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = (
            "id",
            "email",
            "first_name",
            "last_name",
        )
