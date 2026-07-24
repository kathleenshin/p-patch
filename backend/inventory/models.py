from django.conf import settings
from django.db import models


class InventoryItem(models.Model):
    item = models.CharField(max_length=100)

    quantity = models.PositiveIntegerField(default=0)

    location = models.CharField(max_length=100)

    added_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="inventory_items_added",
    )

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.item