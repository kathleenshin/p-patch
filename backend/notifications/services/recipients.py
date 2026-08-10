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


def get_active_plot_steward_emails(garden: Garden) -> list[str]:
    """Return emails for users with active plot ownerships in a garden."""

    return list(
        PlotOwnership.objects.filter(
            plot__garden=garden,
            end_date__isnull=True,
        )
        .exclude(user__email="")
        .values_list("user__email", flat=True)
        .distinct()
    )


def get_active_admin_emails(garden: Garden) -> list[str]:
    """Return emails for active garden admins."""

    return list(
        GardenMembership.objects.filter(
            garden=garden,
            status="active",
            role="admin",
        )
        .exclude(user__email="")
        .values_list("user__email", flat=True)
        .distinct()
    )


def get_urgent_help_request_recipient_emails(
    garden: Garden,
) -> list[str]:
    """Return plot stewards and admins for urgent help request notifications."""

    plot_steward_emails = get_active_plot_steward_emails(garden)
    admin_emails = get_active_admin_emails(garden)

    return list(
        dict.fromkeys(
            plot_steward_emails + admin_emails
        )
    )


def get_weekly_summary_recipient_emails(garden: Garden) -> list[str]:
    """Return plot stewards and admins who should receive the weekly summary."""

    plot_steward_emails = get_active_plot_steward_emails(garden)
    admin_emails = get_active_admin_emails(garden)

    return list(
        dict.fromkeys(
            plot_steward_emails + admin_emails
        )
    )
