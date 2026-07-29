from django.contrib.auth import get_user_model
from django.test import TestCase

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
            item="Soil",
            quantity="Half bag",
            location="Tool Shed",
            added_by=self.user,
        )

        self.assertEqual(item.item, "Soil")
        self.assertEqual(item.quantity, "Half bag")
        self.assertEqual(item.location, "Tool Shed")
        self.assertEqual(item.added_by, self.user)

    def test_str(self):
        item = InventoryItem.objects.create(
            item="Watering Can",
            quantity="1",
            location="Tool Shed",
            added_by=self.user,
        )

        self.assertEqual(str(item), "Watering Can")

    def test_added_by_set_to_null_when_user_deleted(self):
        item = InventoryItem.objects.create(
            item="Seeds",
            quantity="50 packets",
            location="Storage",
            added_by=self.user,
        )

        self.user.delete()
        item.refresh_from_db()

        self.assertIsNone(item.added_by)