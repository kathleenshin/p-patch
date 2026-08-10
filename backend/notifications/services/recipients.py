from itertools import chain

from plots.models import Garden, GardenMembership, PlotOwnership


def get_active_garden_member_emails(garden: Garden) -> list[str]:
    """Return emails for active, approved garden members."""

    return list(
        garden.memberships.filter(
            status="active",
            user__is_approved=True,
        )
        .exclude(user__email="")
        .values_list("user__email", flat=True)
        .distinct()
    )


def get_weekly_summary_recipient_emails(garden: Garden) -> list[str]:
    plot_owner_emails = PlotOwnership.objects.filter(
        plot__garden=garden,
        end_date__isnull=True,
    ).exclude(
        user__email=""
    ).values_list("user__email", flat=True)

    admin_emails = GardenMembership.objects.filter(
        garden=garden,
        status="active",
        role="admin",
    ).exclude(
        user__email=""
    ).values_list("user__email", flat=True)

    return list(dict.fromkeys(chain(plot_owner_emails, admin_emails)))
