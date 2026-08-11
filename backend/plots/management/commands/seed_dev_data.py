"""
Seed local demo data for Admin / Plots work.

Creates Judkins Park garden, plots 1–18 (matching frontend map layout),
approved members with PlotOwnership steward rows (including multi-plot
stewards and secondary co-stewards), plus sample unclaimed help requests
and low-stock inventory for Admin panels.

Targets local SQLite by default (DATABASE_URL unset → db.sqlite3).

Idempotent: safe to re-run. Does not change existing passwords.

Usage:
  cd backend && source venv/bin/activate && python manage.py seed_dev_data
"""

from __future__ import annotations

import datetime

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.db import transaction

from help_requests.models import HelpRequest
from inventory.models import InventoryItem
from plots.models import Garden, GardenMembership, Plot, PlotOwnership

User = get_user_model()

DEFAULT_PASSWORD = "devpass123"

# Mirrors frontend/src/app/components/plot/data.ts sections + owners.
# Plots listed without an owner stay unassigned (Admin "Unassigned Plots").
PLOT_SEEDS = [
    {"plot_number": "1", "owner_email": "james.l@example.com"},
    {"plot_number": "2", "owner_email": None},
    {"plot_number": "3", "owner_email": None},
    {"plot_number": "4", "owner_email": "sofia.m@example.com"},
    {"plot_number": "5", "owner_email": "theo.r@example.com"},
    {"plot_number": "6", "owner_email": None},
    {"plot_number": "7", "owner_email": "amara.o@example.com"},
    {"plot_number": "8", "owner_email": None},
    {"plot_number": "9", "owner_email": None},
    {"plot_number": "10", "owner_email": "luis.m@example.com"},
    {"plot_number": "11", "owner_email": "elena.v@example.com"},
    {"plot_number": "12", "owner_email": None},
    {"plot_number": "13", "owner_email": "kenji.t@example.com"},
    {"plot_number": "14", "owner_email": "sue.k@example.com"},
    {"plot_number": "15", "owner_email": None},
    {"plot_number": "16", "owner_email": "priya.n@example.com"},
    {"plot_number": "17", "owner_email": "marco.r@example.com"},
    {"plot_number": "18", "owner_email": None},
]

MEMBERS = [
    {
        "email": "james.l@example.com",
        "first_name": "James",
        "last_name": "Lee",
        "role": "plot_steward",
    },
    {
        "email": "sofia.m@example.com",
        "first_name": "Sofia",
        "last_name": "Martinez",
        "role": "plot_steward",
    },
    {
        "email": "theo.r@example.com",
        "first_name": "Theo",
        "last_name": "Ross",
        "role": "plot_steward",
    },
    {
        "email": "amara.o@example.com",
        "first_name": "Amara",
        "last_name": "Okoro",
        "role": "plot_steward",
    },
    {
        "email": "luis.m@example.com",
        "first_name": "Luis",
        "last_name": "Mendez",
        "role": "plot_steward",
    },
    {
        "email": "elena.v@example.com",
        "first_name": "Elena",
        "last_name": "Vargas",
        "role": "plot_steward",
    },
    {
        "email": "kenji.t@example.com",
        "first_name": "Kenji",
        "last_name": "Tanaka",
        "role": "plot_steward",
    },
    {
        "email": "sue.k@example.com",
        "first_name": "Sue",
        "last_name": "Kim",
        "role": "plot_steward",
    },
    {
        "email": "priya.n@example.com",
        "first_name": "Priya",
        "last_name": "Nair",
        "role": "plot_steward",
    },
    {
        "email": "marco.r@example.com",
        "first_name": "Marco",
        "last_name": "Rossi",
        "role": "plot_steward",
    },
    # Co-owner on plot 11 (Elena primary) so multi-owner paths are testable.
    {
        "email": "coowner@example.com",
        "first_name": "Casey",
        "last_name": "Nguyen",
        "role": "plot_steward",
    },
    {
        "email": "volunteer@example.com",
        "first_name": "Riley",
        "last_name": "Chen",
        "role": "community_volunteer",
    },
    {
        "email": "pending.member@example.com",
        "first_name": "Pat",
        "last_name": "Pending",
        "role": None,  # no membership until approved
        "is_approved": False,
    },
]

# Extra stewardship beyond the 1:1 primary map above:
# - same steward on multiple plots
# - secondary stewards on plots that already have a primary
EXTRA_STEWARDS = [
    # James also stewards plot 2 (in addition to plot 1).
    {"plot_number": "2", "email": "james.l@example.com", "is_primary": True},
    # Sofia also stewards plot 6 (in addition to plot 4).
    {"plot_number": "6", "email": "sofia.m@example.com", "is_primary": True},
    # Secondary stewards on plots that already have a primary.
    {"plot_number": "1", "email": "sofia.m@example.com", "is_primary": False},
    {"plot_number": "4", "email": "theo.r@example.com", "is_primary": False},
    {"plot_number": "5", "email": "amara.o@example.com", "is_primary": False},
    {"plot_number": "7", "email": "luis.m@example.com", "is_primary": False},
]

# If this local bootstrap account exists, give them a plot so PlotScreen
# "my plot" works when logged in as garden admin.
BOOTSTRAP_STEWARD = {
    "email": "superuser@example.com",
    "plot_number": "18",
    "is_primary": True,
}


class Command(BaseCommand):
    help = (
        "Seed Judkins Park garden, plots 1–18 with ownerships, "
        "sample help requests, and inventory alerts for local Admin work."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--password",
            default=DEFAULT_PASSWORD,
            help=f"Password for newly created seed users (default: {DEFAULT_PASSWORD})",
        )

    @transaction.atomic
    def handle(self, *args, **options):
        # Phase 2 helper: seed garden/plots/tasks/inventory so Admin panels
        # have live unassigned plots, unclaimed tasks, and low-stock alerts.
        password = options["password"]
        garden = self._ensure_garden()
        users = self._ensure_users(password)
        self._ensure_memberships(garden, users)
        plots = self._ensure_plots(garden)
        self._ensure_ownerships(plots, users)
        self._ensure_help_requests(garden, plots, users)
        self._ensure_inventory(garden, users)

        # Summarize unassigned plots for Admin "Unassigned Plots" demos.
        assigned_ids = set(
            PlotOwnership.objects.filter(
                plot__garden=garden,
                end_date__isnull=True,
            ).values_list("plot_id", flat=True)
        )
        total_active = Plot.objects.filter(garden=garden, is_active=True).count()
        unassigned = total_active - len(assigned_ids)

        self.stdout.write(self.style.SUCCESS("Dev seed complete."))
        self.stdout.write(f"  Garden: {garden.name} (id={garden.id})")
        self.stdout.write(
            f"  Plots: {total_active} active "
            f"({len(assigned_ids)} owned, {unassigned} unassigned)"
        )
        self.stdout.write(f"  Seed user password (new users only): {password}")
        self.stdout.write(
            "  Log in as superuser (garden admin) or any *@example.com member above."
        )

    def _ensure_garden(self) -> Garden:
        garden, created = Garden.objects.get_or_create(
            name="Judkins Park P-Patch",
            defaults={
                "description": "Community garden in Judkins Park, Seattle.",
                "address": "2321 S Norman St",
                "city": "Seattle",
                "state": "WA",
                "zip_code": "98144",
                "latitude": "47.591700",
                "longitude": "-122.292600",
            },
        )
        self.stdout.write(
            f"  {'Created' if created else 'Found'} garden {garden.name}"
        )
        return garden

    def _ensure_users(self, password: str) -> dict[str, User]:
        users: dict[str, User] = {}
        for spec in MEMBERS:
            email = spec["email"]
            defaults = {
                "first_name": spec["first_name"],
                "last_name": spec["last_name"],
                "is_approved": spec.get("is_approved", True),
                "is_garden_admin": False,
                "is_staff": False,
                "is_superuser": False,
            }
            user, created = User.objects.get_or_create(
                email=email,
                defaults={**defaults, "username": email},
            )
            if created:
                user.set_password(password)
                user.save()
                self.stdout.write(f"  Created user {email}")
            else:
                # Keep approval/name in sync for re-runs without touching password.
                changed = False
                for field, value in defaults.items():
                    if getattr(user, field) != value:
                        setattr(user, field, value)
                        changed = True
                if changed:
                    user.save()
                    self.stdout.write(f"  Updated user {email}")
            users[email] = user
        return users

    def _ensure_memberships(self, garden: Garden, users: dict[str, User]) -> None:
        for spec in MEMBERS:
            role = spec.get("role")
            if role is None:
                continue
            user = users[spec["email"]]
            membership, created = GardenMembership.objects.get_or_create(
                garden=garden,
                user=user,
                defaults={
                    "role": role,
                    "status": "active",
                },
            )
            if not created and (
                membership.role != role or membership.status != "active"
            ):
                membership.role = role
                membership.status = "active"
                membership.save(update_fields=["role", "status"])

    def _ensure_plots(self, garden: Garden) -> dict[str, Plot]:
        plots: dict[str, Plot] = {}
        for seed in PLOT_SEEDS:
            plot, created = Plot.objects.get_or_create(
                garden=garden,
                plot_number=seed["plot_number"],
                defaults={"is_active": True},
            )
            if not plot.is_active:
                plot.is_active = True
                plot.save(update_fields=["is_active"])
            plots[seed["plot_number"]] = plot
            if created:
                self.stdout.write(f"  Created plot {seed['plot_number']}")
        return plots

    def _ensure_ownerships(
        self,
        plots: dict[str, Plot],
        users: dict[str, User],
    ) -> None:
        start = datetime.date(2024, 3, 1)
        for seed in PLOT_SEEDS:
            plot = plots[seed["plot_number"]]
            owner_email = seed["owner_email"]
            if owner_email is None:
                # Leave unassigned: end any active ownerships from prior seeds.
                ended = PlotOwnership.objects.filter(
                    plot=plot,
                    end_date__isnull=True,
                ).update(end_date=datetime.date.today(), is_primary=False)
                if ended:
                    self.stdout.write(
                        f"  Cleared ownership on unassigned plot {plot.plot_number}"
                    )
                continue

            user = users[owner_email]
            ownership, created = PlotOwnership.objects.get_or_create(
                plot=plot,
                user=user,
                end_date=None,
                defaults={
                    "is_primary": True,
                    "start_date": start,
                },
            )
            if not ownership.is_primary:
                PlotOwnership.set_primary_contact(plot, user)
            elif created:
                self.stdout.write(
                    f"  Assigned plot {plot.plot_number} → {owner_email}"
                )

        # Co-owner on plot 11 (secondary, not primary).
        plot_11 = plots["11"]
        coowner = users["coowner@example.com"]
        self._ensure_steward(
            plot=plot_11,
            user=coowner,
            is_primary=False,
            start_date=datetime.date(2025, 6, 1),
        )

        for extra in EXTRA_STEWARDS:
            self._ensure_steward(
                plot=plots[extra["plot_number"]],
                user=users[extra["email"]],
                is_primary=extra["is_primary"],
                start_date=start,
            )

        bootstrap_email = BOOTSTRAP_STEWARD["email"]
        bootstrap_user = User.objects.filter(email=bootstrap_email).first()
        if bootstrap_user is not None:
            GardenMembership.objects.get_or_create(
                garden=plots[BOOTSTRAP_STEWARD["plot_number"]].garden,
                user=bootstrap_user,
                defaults={
                    "role": "admin",
                    "status": "active",
                },
            )
            self._ensure_steward(
                plot=plots[BOOTSTRAP_STEWARD["plot_number"]],
                user=bootstrap_user,
                is_primary=BOOTSTRAP_STEWARD["is_primary"],
                start_date=start,
            )

    def _ensure_steward(
        self,
        *,
        plot: Plot,
        user: User,
        is_primary: bool,
        start_date: datetime.date,
    ) -> None:
        ownership, created = PlotOwnership.objects.get_or_create(
            plot=plot,
            user=user,
            end_date=None,
            defaults={
                "is_primary": is_primary,
                "start_date": start_date,
            },
        )

        if is_primary and not ownership.is_primary:
            PlotOwnership.set_primary_contact(plot, user)
            self.stdout.write(
                f"  Set primary steward plot {plot.plot_number} → {user.email}"
            )
        elif created:
            role = "primary" if is_primary else "secondary"
            self.stdout.write(
                f"  Assigned {role} steward plot {plot.plot_number} → {user.email}"
            )

    def _ensure_help_requests(
        self,
        garden: Garden,
        plots: dict[str, Plot],
        users: dict[str, User],
    ) -> None:
        creator = users["elena.v@example.com"]
        samples = [
            {
                "title": "Repair the north fence",
                "description": "Loose boards near plot 5 need securing.",
                "priority": HelpRequest.Priority.HIGH,
                "category": HelpRequest.Category.MAINTENANCE,
                "plot": plots["5"],
                "assigned_to": None,
                "due_date": datetime.date(2026, 9, 15),
            },
            {
                "title": "Water shared flower bed",
                "description": "Community bed along the east path is dry.",
                "priority": HelpRequest.Priority.MEDIUM,
                "category": HelpRequest.Category.WATERING,
                "plot": None,
                "assigned_to": None,
                "due_date": datetime.date(2026, 10, 2),
            },
            {
                "title": "Harvest excess kale",
                "description": "Plot 1 has surplus for the donation fridge.",
                "priority": HelpRequest.Priority.LOW,
                "category": HelpRequest.Category.GARDENING,
                "plot": plots["1"],
                "assigned_to": users["volunteer@example.com"],
                "due_date": datetime.date(2026, 8, 20),
            },
        ]
        for sample in samples:
            exists = HelpRequest.objects.filter(
                garden=garden,
                title=sample["title"],
            ).exists()
            if exists:
                continue
            HelpRequest.objects.create(
                garden=garden,
                created_by=creator,
                status=HelpRequest.Status.ACTIVE,
                **sample,
            )
            self.stdout.write(f"  Created help request: {sample['title']}")

    def _ensure_inventory(self, garden: Garden, users: dict[str, User]) -> None:
        added_by = users["elena.v@example.com"]
        samples = [
            {"item": "Wheelbarrow", "quantity": "0", "location": "Tool shed"},
            {"item": "Organic Fertilizer", "quantity": "2", "location": "Tool shed"},
            {"item": "Watering cans", "quantity": "8", "location": "Tool shed"},
            {"item": "Hand trowels", "quantity": "12", "location": "Tool shed"},
        ]
        for sample in samples:
            item, created = InventoryItem.objects.get_or_create(
                garden=garden,
                item=sample["item"],
                defaults={
                    "quantity": sample["quantity"],
                    "location": sample["location"],
                    "added_by": added_by,
                },
            )
            if created:
                self.stdout.write(f"  Created inventory: {sample['item']}")
            elif item.quantity != sample["quantity"]:
                item.quantity = sample["quantity"]
                item.save(update_fields=["quantity"])
