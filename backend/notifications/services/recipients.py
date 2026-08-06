from plots.models import Garden


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