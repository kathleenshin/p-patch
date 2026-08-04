from django.db import connection
from django.db.utils import OperationalError, ProgrammingError
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from .models import InventoryItem


def inventory_has_garden_column():
    try:
        with connection.cursor() as cursor:
            columns = connection.introspection.get_table_description(cursor, "inventory_inventoryitem")
    except Exception:
        return False

    return any(column.name == "garden_id" for column in columns)


def serialize_inventory_item(item, supports_garden=None):
    supports_garden = supports_garden if supports_garden is not None else inventory_has_garden_column()

    garden_name = None
    if supports_garden:
        try:
            garden_name = item.garden.name if getattr(item, "garden", None) else None
        except Exception:
            garden_name = None

    return {
        "id": item.id,
        "garden_id": getattr(item, "garden_id", None) if supports_garden else None,
        "garden_name": garden_name,
        "item": item.item,
        "quantity": item.quantity,
        "location": item.location,
        "added_by": item.added_by.email if item.added_by else None,
        "created_at": item.created_at.isoformat(),
    }


def build_inventory_item_kwargs(request):
    item = request.data.get("item", "").strip()
    quantity = request.data.get("quantity", "").strip()
    location = request.data.get("location", "").strip()

    if not item or not quantity or not location:
        return None, Response(
            {"detail": "Item, quantity, and location are required."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    kwargs = {
        "item": item,
        "quantity": quantity,
        "location": location,
        "added_by": request.user if request.user.is_authenticated else None,
    }

    if inventory_has_garden_column():
        garden_id = request.data.get("garden_id")
        if not garden_id:
            return None, Response(
                {"detail": "Item, quantity, location, and garden are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        kwargs["garden_id"] = garden_id

    return kwargs, None


def create_inventory_item(kwargs):
    try:
        return InventoryItem.objects.create(**kwargs)
    except (ProgrammingError, OperationalError):
        fallback_kwargs = {key: value for key, value in kwargs.items() if key != "garden_id"}
        return InventoryItem.objects.create(**fallback_kwargs)


@api_view(["GET", "POST"])
@permission_classes([AllowAny])
def inventory_list(request):
    if request.method == "GET":
        supports_garden = inventory_has_garden_column()
        items = InventoryItem.objects.select_related("added_by").order_by("-created_at")
        if not supports_garden:
            return Response([serialize_inventory_item(item, supports_garden=False) for item in items])

        try:
            items = items.select_related("garden")
        except ProgrammingError:
            supports_garden = False
            items = InventoryItem.objects.select_related("added_by").order_by("-created_at")

        return Response([serialize_inventory_item(item, supports_garden=supports_garden) for item in items])

    if request.method == "POST":
        kwargs, error_response = build_inventory_item_kwargs(request)
        if error_response is not None:
            return error_response

        inventory_item = create_inventory_item(kwargs)

        return Response(serialize_inventory_item(inventory_item), status=status.HTTP_201_CREATED)

    return Response(status=status.HTTP_405_METHOD_NOT_ALLOWED)


@api_view(["PUT", "DELETE"])
@permission_classes([AllowAny])
def inventory_detail(request, pk):
    try:
        inventory_item = InventoryItem.objects.get(pk=pk)
    except InventoryItem.DoesNotExist:
        return Response({"detail": "Inventory item not found."}, status=status.HTTP_404_NOT_FOUND)

    if request.method == "PUT":
        kwargs, error_response = build_inventory_item_kwargs(request)
        if error_response is not None:
            return error_response

        inventory_item.item = kwargs["item"]
        inventory_item.quantity = kwargs["quantity"]
        inventory_item.location = kwargs["location"]
        inventory_item.added_by = kwargs["added_by"]
        if inventory_has_garden_column() and "garden_id" in kwargs:
            inventory_item.garden_id = kwargs["garden_id"]
        try:
            inventory_item.save()
        except (ProgrammingError, OperationalError):
            inventory_item.garden_id = None
            inventory_item.save(update_fields=["item", "quantity", "location", "added_by"])

        return Response(serialize_inventory_item(inventory_item))

    if request.method == "DELETE":
        inventory_item.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    return Response(status=status.HTTP_405_METHOD_NOT_ALLOWED)
