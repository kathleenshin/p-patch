from rest_framework.permissions import BasePermission


class IsGardenAdmin(BasePermission):
    """App Admin APIs require is_garden_admin only (not Django is_staff)."""

    def has_permission(self, request, view):
        user = request.user
        return bool(
            user
            and user.is_authenticated
            and user.is_garden_admin
        )
