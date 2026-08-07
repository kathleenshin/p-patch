from rest_framework import serializers

from .models import Announcement


class AnnouncementSerializer(serializers.ModelSerializer):
    """API shape for Dashboard Community board rows."""

    # Display helpers so the frontend does not re-derive names.
    author_name = serializers.SerializerMethodField()
    author_email = serializers.EmailField(source="author.email", read_only=True)

    class Meta:
        model = Announcement
        fields = [
            "id",
            "body",
            "author",
            "author_name",
            "author_email",
            "created_at",
        ]
        read_only_fields = [
            "id",
            "author",
            "author_name",
            "author_email",
            "created_at",
        ]

    def get_author_name(self, announcement: Announcement) -> str:
        # Prefer full name; fall back to email for incomplete profiles.
        name = f"{announcement.author.first_name} {announcement.author.last_name}".strip()
        return name or announcement.author.email
