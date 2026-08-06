def get_active_garden_member_emails(garden) -> list[str]:
    # Return email addresses for active, approved garden members

    emails = []

    for membership in garden.memberships.all():
        user = membership.user

        if (
            membership.status == "active"
            and user.is_approved
            and user.email
        ):
            emails.append(user.email)

    return emails