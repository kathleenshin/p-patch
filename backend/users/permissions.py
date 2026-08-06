from rest_framework.permissions import SAFE_METHODS, BasePermission


class IsApproved(BasePermission):
    # Member APIs: must be logged in and past pending approval.
    def has_permission(self, request, view):
        user = request.user
        return bool(
            user
            and user.is_authenticated
            and user.is_approved
        )


class IsGardenAdmin(BasePermission):
    """App Admin APIs require is_garden_admin only (not Django is_staff)."""

    def has_permission(self, request, view):
        user = request.user
        return bool(
            user
            and user.is_authenticated
            and user.is_garden_admin
        )


class IsApprovedReadOrGardenAdminWrite(BasePermission):
    # For plots-style resources: approved members read; only garden admins write.
    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        if request.method in SAFE_METHODS:
            return bool(user.is_approved)
        return bool(user.is_garden_admin)
