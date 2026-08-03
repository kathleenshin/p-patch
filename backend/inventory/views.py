from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from .models import InventoryItem


def serialize_inventory_item(item):
    return {
        "id": item.id,
        "item": item.item,
        "quantity": item.quantity,
        "location": item.location,
        "added_by": item.added_by.email if item.added_by else None,
        "created_at": item.created_at.isoformat(),
    }


@api_view(["GET", "POST"])
@permission_classes([AllowAny])
def inventory_list(request):
    if request.method == "GET":
        items = InventoryItem.objects.select_related("added_by").order_by("-created_at")
        return Response([serialize_inventory_item(item) for item in items])

    if request.method == "POST":
        item = request.data.get("item", "").strip()
        quantity = request.data.get("quantity", "").strip()
        location = request.data.get("location", "").strip()

        if not item or not quantity or not location:
            return Response(
                {"detail": "Item, quantity, and location are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        inventory_item = InventoryItem.objects.create(
            item=item,
            quantity=quantity,
            location=location,
            added_by=request.user if request.user.is_authenticated else None,
        )

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
        item = request.data.get("item", "").strip()
        quantity = request.data.get("quantity", "").strip()
        location = request.data.get("location", "").strip()

        if not item or not quantity or not location:
            return Response(
                {"detail": "Item, quantity, and location are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        inventory_item.item = item
        inventory_item.quantity = quantity
        inventory_item.location = location
        inventory_item.save()

        return Response(serialize_inventory_item(inventory_item))

    if request.method == "DELETE":
        inventory_item.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    return Response(status=status.HTTP_405_METHOD_NOT_ALLOWED)
