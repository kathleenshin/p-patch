from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from .models import InventoryItem

User = get_user_model()


class InventoryItemModelTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.user = User.objects.create_user(
            email="testuser@example.com",
            password="password",
        )

    def test_inventory_list_api_returns_items(self):
        InventoryItem.objects.create(
            item="Seeds",
            quantity="50 packets",
            location="Tool Shed",
            added_by=self.user,
        )

        client = APIClient()
        response = client.get("/api/inventory/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["item"], "Seeds")

    def test_inventory_create_api_accepts_new_items(self):
        client = APIClient()
        response = client.post(
            "/api/inventory/",
            {
                "item": "Compost",
                "quantity": "3 bags",
                "location": "North Bed",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(InventoryItem.objects.count(), 1)
        self.assertEqual(InventoryItem.objects.get().item, "Compost")

    def test_inventory_update_api_updates_existing_item(self):
        item = InventoryItem.objects.create(
            item="Seeds",
            quantity="50 packets",
            location="Tool Shed",
            added_by=self.user,
        )

        client = APIClient()
        response = client.put(
            f"/api/inventory/{item.id}/",
            {
                "item": "Seeds",
                "quantity": "100 packets",
                "location": "Greenhouse",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        item.refresh_from_db()
        self.assertEqual(item.quantity, "100 packets")
        self.assertEqual(item.location, "Greenhouse")

    def test_inventory_delete_api_removes_item(self):
        item = InventoryItem.objects.create(
            item="Tools",
            quantity="2",
            location="Shed",
            added_by=self.user,
        )

        client = APIClient()
        response = client.delete(f"/api/inventory/{item.id}/")

        self.assertEqual(response.status_code, 204)
        self.assertFalse(InventoryItem.objects.filter(id=item.id).exists())

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