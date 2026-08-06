from rest_framework import serializers
from .models import User


class UserSerializer(serializers.ModelSerializer):
    """Public user profile for /me and admin pending list."""

    class Meta:
        model = User
        fields = (
            "id",
            "email",
            "first_name",
            "last_name",
            "is_approved",
            "is_garden_admin",
            "date_joined",  # Shown on Admin pending registrations
        )
        read_only_fields = fields


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)
    full_name = serializers.CharField(write_only=True, required=False, allow_blank=True)

    class Meta:
        model = User
        fields = ("email", "password", "full_name")

    def create(self, validated_data):
        full_name = validated_data.pop("full_name", "").strip()
        first_name, _, last_name = full_name.partition(" ")
        return User.objects.create_user(
            email=validated_data["email"],
            password=validated_data["password"],
            first_name=first_name,
            last_name=last_name.strip(),
            is_approved=False,
        )


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)