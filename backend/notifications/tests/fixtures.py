from __future__ import annotations

from datetime import date

from help_requests.models import HelpRequest
from plots.models import Garden, GardenMembership, Plot
from users.models import User


def create_user(
    *,
    username: str = "user",
    email: str = "user@example.com",
    password: str = "password123",
    is_approved: bool = True,
) -> User:
    """Create a test user."""

    return User.objects.create_user(
        username=username,
        email=email,
        password=password,
        is_approved=is_approved,
    )


def create_garden(
    *,
    name: str = "Garden A",
    description: str = "",
    city: str = "",
    state: str = "",
) -> Garden:
    """Create a test garden."""

    return Garden.objects.create(
        name=name,
        description=description,
        city=city,
        state=state,
    )


def create_membership(
    *,
    garden: Garden,
    user: User,
    role: str = "community_volunteer",
    status: str = "active",
) -> GardenMembership:
    """Create a garden membership."""

    return GardenMembership.objects.create(
        garden=garden,
        user=user,
        role=role,
        status=status,
    )


def create_plot(
    *,
    garden: Garden,
    plot_number: str = "12",
    is_active: bool = True,
) -> Plot:
    """Create a garden plot."""

    return Plot.objects.create(
        garden=garden,
        plot_number=plot_number,
        is_active=is_active,
    )


def create_help_request(
    *,
    garden: Garden,
    created_by: User | None,
    plot: Plot | None = None,
    assigned_to: User | None = None,
    title: str = "Water plants",
    description: str = "Please water the tomatoes.",
    status: str = HelpRequest.Status.ACTIVE,
    priority: str = HelpRequest.Priority.MEDIUM,
    category: str = HelpRequest.Category.OTHER,
    due_date: date | None = None,
) -> HelpRequest:
    """Create a help request."""

    return HelpRequest.objects.create(
        garden=garden,
        plot=plot,
        created_by=created_by,
        assigned_to=assigned_to,
        title=title,
        description=description,
        status=status,
        priority=priority,
        category=category,
        due_date=due_date,
    )