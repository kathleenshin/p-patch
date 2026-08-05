from rest_framework.permissions import BasePermission

from plots.models import PlotOwnership


class IsApproved(BasePermission):
    """Approved members (garden admins count as approved for write routes)."""

    def has_permission(self, request, view):
        user = request.user
        return bool(
            user
            and user.is_authenticated
            and (user.is_approved or user.is_garden_admin)
        )


class IsGardenAdmin(BasePermission):
    """App Admin APIs require is_garden_admin (not Django is_staff)."""

    def has_permission(self, request, view):
        user = request.user
        return bool(user and user.is_authenticated and user.is_garden_admin)


class IsPlotOwnerOrGardenAdmin(BasePermission):
    """Object-level: active PlotOwnership, or garden admin."""

    message = "Only plot owners can modify notes on this plot."

    def has_permission(self, request, view):
        # View-level gate; object ownership is checked in has_object_permission.
        return bool(request.user and request.user.is_authenticated)

    def has_object_permission(self, request, view, obj):
        # Accept Plot or PlotNote; resolve to the related plot.
        plot = getattr(obj, "plot", obj)
        user = request.user
        if user.is_garden_admin:
            return True
        return PlotOwnership.objects.filter(
            plot=plot,
            user=user,
            end_date__isnull=True,
        ).exists()
