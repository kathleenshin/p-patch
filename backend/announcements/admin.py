from django.contrib import admin

from .models import Announcement


@admin.register(Announcement)
class AnnouncementAdmin(admin.ModelAdmin):
    # Django admin escape hatch for garden ops / debugging.
    list_display = ("id", "author", "created_at", "body")
    list_filter = ("created_at",)
    search_fields = ("body", "author__email")
    readonly_fields = ("created_at",)
