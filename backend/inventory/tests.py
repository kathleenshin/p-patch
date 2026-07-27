from django.test import TestCase
from django.contrib.auth import get_user_model

from .models import InventoryItem

User = get_user_model()


class InventoryItemModelTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.user = User.objects.create_user(
            username="testuser",
            password="password",
        )

    def test_create_inventory_item(self):
        item = InventoryItem.objects.create(
            item="Shovel",
            quantity=5,
            location="Tool Shed",
            added_by=self.user,
        )

        self.assertEqual(item.item, "Shovel")
        self.assertEqual(item.quantity, 5)
        self.assertEqual(item.location, "Tool Shed")
        self.assertEqual(item.added_by, self.user)

    def test_quantity_defaults_to_zero(self):
        item = InventoryItem.objects.create(
            item="Gloves",
            location="Storage",
            added_by=self.user,
        )

        self.assertEqual(item.quantity, 0)

    def test_str(self):
        item = InventoryItem.objects.create(
            item="Watering Can",
            location="Tool Shed",
            added_by=self.user,
        )

        self.assertEqual(str(item), "Watering Can")

    def test_added_by_set_to_null_when_user_deleted(self):
        item = InventoryItem.objects.create(
            item="Seeds",
            location="Storage",
            added_by=self.user,
        )

        self.user.delete()
        item.refresh_from_db()

        self.assertIsNone(item.added_by)