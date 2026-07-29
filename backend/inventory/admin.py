from django.contrib import admin
from .models import InventoryItem


@admin.register(InventoryItem)
class InventoryItemAdmin(admin.ModelAdmin):
    list_display = (
        "item",
        "quantity",
        "location",
        "added_by",
        "created_at",
    )

    search_fields = (
        "item",
        "location",
    )

    list_filter = (
        "location",
    )