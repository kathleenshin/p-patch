from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from .models import InventoryItem


def serialize_inventory_item(item):
    garden_name = None
    try:
        garden_name = item.garden.name if getattr(item, "garden", None) else None
    except Exception:
        garden_name = None

    return {
        "id": item.id,
        "garden_id": getattr(item, "garden_id", None),
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

    garden_id = request.data.get("garden_id")
    if not garden_id:
        return None, Response(
            {"detail": "Item, quantity, location, and garden are required."},
            status=status.HTTP_400_BAD_REQUEST,
        )
    kwargs["garden_id"] = garden_id

    return kwargs, None


def create_inventory_item(kwargs):
    return InventoryItem.objects.create(**kwargs)


@api_view(["GET", "POST"])
@permission_classes([AllowAny])
def inventory_list(request):
    if request.method == "GET":
        items = InventoryItem.objects.select_related("added_by").prefetch_related("garden").order_by("-created_at")
        return Response([serialize_inventory_item(item) for item in items])

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
        inventory_item.garden_id = kwargs["garden_id"]
        inventory_item.save()

        return Response(serialize_inventory_item(inventory_item))

    if request.method == "DELETE":
        inventory_item.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    return Response(status=status.HTTP_405_METHOD_NOT_ALLOWED)
