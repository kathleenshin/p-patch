from datetime import timedelta

from django.conf import settings
from django.db import models
from django.utils import timezone

# Community board posts older than this are deleted on list/create.
RETENTION_DAYS = 30


class Announcement(models.Model):
    """Garden-admin community board post shown on the Dashboard."""

    body = models.TextField()
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="announcements",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        preview = self.body.strip().replace("\n", " ")[:40]
        return f"Announcement({self.pk}): {preview}"

    @classmethod
    def purge_expired(cls) -> int:
        """Delete posts older than RETENTION_DAYS. Returns number removed."""
        cutoff = timezone.now() - timedelta(days=RETENTION_DAYS)
        deleted, _ = cls.objects.filter(created_at__lt=cutoff).delete()
        return deleted
