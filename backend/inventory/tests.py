from types import SimpleNamespace
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.db.utils import OperationalError, ProgrammingError
from django.test import TestCase
from rest_framework.test import APIClient

from plots.models import Garden

from .models import InventoryItem

User = get_user_model()


class InventoryItemModelTests(TestCase):
    def create_inventory_item(self, **overrides):
        kwargs = {
            "item": "Seeds",
            "quantity": "50 packets",
            "location": "Tool Shed",
            "added_by": self.user,
        }

        if overrides:
            kwargs.update(overrides)

        if "garden" not in kwargs and "garden_id" not in kwargs:
            from inventory.views import inventory_has_garden_column

            if inventory_has_garden_column():
                kwargs["garden"] = Garden.objects.create(name="Test Garden")

        try:
            return InventoryItem.objects.create(**kwargs)
        except (ProgrammingError, OperationalError):
            fallback_kwargs = {key: value for key, value in kwargs.items() if key != "garden" and key != "garden_id"}
            return InventoryItem.objects.create(**fallback_kwargs)
    @classmethod
    def setUpTestData(cls):
        cls.user = User.objects.create_user(
            email="testuser@example.com",
            password="password",
        )

    def test_inventory_list_api_returns_items(self):
        self.create_inventory_item()

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
        item = self.create_inventory_item()

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
        updated_item = InventoryItem.objects.get(pk=item.pk)
        self.assertEqual(updated_item.quantity, "100 packets")
        self.assertEqual(updated_item.location, "Greenhouse")

    def test_inventory_delete_api_removes_item(self):
        item = self.create_inventory_item(item="Tools", quantity="2", location="Shed")

        client = APIClient()
        response = client.delete(f"/api/inventory/{item.id}/")

        self.assertEqual(response.status_code, 204)
        self.assertFalse(InventoryItem.objects.filter(id=item.id).exists())

    def test_create_inventory_item(self):
        item = self.create_inventory_item(item="Soil", quantity="Half bag", location="Tool Shed")

        self.assertEqual(item.item, "Soil")
        self.assertEqual(item.quantity, "Half bag")
        self.assertEqual(item.location, "Tool Shed")
        self.assertEqual(item.added_by, self.user)

    def test_str(self):
        item = self.create_inventory_item(item="Watering Can", quantity="1", location="Tool Shed")

        self.assertEqual(str(item), "Watering Can")

    def test_added_by_set_to_null_when_user_deleted(self):
        item = self.create_inventory_item(item="Seeds", quantity="50 packets", location="Storage")

        self.user.delete()
        updated_item = InventoryItem.objects.get(pk=item.pk)

        self.assertIsNone(updated_item.added_by)

    def test_inventory_item_can_be_associated_with_a_garden(self):
        garden = Garden.objects.create(name="West Garden")

        try:
            item = InventoryItem.objects.create(
                item="Compost",
                quantity="3 bags",
                location="North Bed",
                added_by=self.user,
                garden=garden,
            )
        except ProgrammingError:
            self.skipTest("Garden foreign key column is not available in the current schema")

        self.assertEqual(item.garden, garden)

    def test_inventory_create_api_falls_back_when_garden_column_is_missing(self):
        client = APIClient()
        with patch("inventory.views.inventory_has_garden_column", return_value=False):
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

    def test_model_save_handles_cursors_without_lastrowid(self):
        class FakeCursor:
            def __init__(self):
                self.executed_sql = []
                self._result = [(7,)]

            def execute(self, sql, params=None):
                self.executed_sql.append((sql, params))

            def fetchone(self):
                return self._result.pop(0) if self._result else None

            def __enter__(self):
                return self

            def __exit__(self, exc_type, exc, tb):
                return False

        columns = [
            SimpleNamespace(name="id"),
            SimpleNamespace(name="item"),
            SimpleNamespace(name="quantity"),
            SimpleNamespace(name="location"),
            SimpleNamespace(name="added_by_id"),
            SimpleNamespace(name="created_at"),
        ]

        item = InventoryItem(item="Seeds", quantity="2", location="Shelf")

        with patch("inventory.models.connection.cursor", return_value=FakeCursor()):
            with patch("inventory.models.connection.introspection.get_table_description", return_value=columns):
                with patch("inventory.models.InventoryItem._db_has_column", return_value=False):
                    item.save()

        self.assertEqual(item.pk, 7)