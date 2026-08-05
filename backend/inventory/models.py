from django.conf import settings
from django.db import models


class InventoryItemQuerySet(models.QuerySet):
    def safe(self):
        return self.only("id", "item", "quantity", "location", "added_by_id", "created_at")


class InventoryItemManager(models.Manager.from_queryset(InventoryItemQuerySet)):
    def get_queryset(self):
        return super().get_queryset().safe()


class InventoryItem(models.Model):
    garden = models.ForeignKey(
        "plots.Garden",
        on_delete=models.CASCADE,
        related_name="inventory_items",
        null=True,
        blank=True,
    )

    item = models.CharField(max_length=100)

    quantity = models.CharField(max_length=100)

    location = models.CharField(max_length=100)

    added_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="inventory_items_added",
    )

    created_at = models.DateTimeField(auto_now_add=True)

    objects = InventoryItemManager()

    def __str__(self):
        return self.item