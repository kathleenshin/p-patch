from rest_framework import serializers

from .models import User


class UserSerializer(serializers.ModelSerializer):
    """Public user profile for /me and admin pending list."""

    class Meta:
        model = User
        fields = (
            "id",
            "email",
            "pending_email",
            "first_name",
            "last_name",
            "is_approved",
            "is_garden_admin",
            "date_joined",  # Shown on Admin pending registrations
        )
        read_only_fields = fields


class RegisterSerializer(serializers.ModelSerializer):
    # Explicit so we own uniqueness (inactive users may re-register / resend).
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, min_length=8)
    full_name = serializers.CharField(write_only=True, required=False, allow_blank=True)

    class Meta:
        model = User
        fields = ("email", "password", "full_name")

    def validate_email(self, value):
        email = User.objects.normalize_email(value.strip())
        existing = User.objects.filter(email__iexact=email).first()
        if existing is None:
            return email
        if existing.is_active:
            raise serializers.ValidationError(
                "A user with this email already exists.",
            )
        # Unconfirmed signup: allow retry (view will resend the email).
        self.context["existing_unconfirmed_user"] = existing
        return existing.email

    def create(self, validated_data):
        full_name = validated_data.pop("full_name", "").strip()
        first_name, _, last_name = full_name.partition(" ")
        existing = self.context.get("existing_unconfirmed_user")
        if existing is not None:
            existing.set_password(validated_data["password"])
            existing.first_name = first_name
            existing.last_name = last_name.strip()
            existing.save(update_fields=["password", "first_name", "last_name"])
            return existing
        # Inactive until the user confirms their email; still pending garden approval.
        return User.objects.create_user(
            email=validated_data["email"],
            password=validated_data["password"],
            first_name=first_name,
            last_name=last_name.strip(),
            is_approved=False,
            is_active=False,
        )


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)


class ConfirmEmailSerializer(serializers.Serializer):
    uid = serializers.CharField()
    token = serializers.CharField()


class ResendConfirmationSerializer(serializers.Serializer):
    email = serializers.EmailField()


class ChangePasswordSerializer(serializers.Serializer):
    current_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True, min_length=8)


class ChangeEmailSerializer(serializers.Serializer):
    new_email = serializers.EmailField()
    current_password = serializers.CharField(write_only=True)

    def validate_new_email(self, value):
        return User.objects.normalize_email(value.strip())


class ConfirmEmailChangeSerializer(serializers.Serializer):
    uid = serializers.CharField()
    token = serializers.CharField()
