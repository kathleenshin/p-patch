import datetime

from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.db import IntegrityError
from django.test import TestCase
from django.utils import timezone

from .models import Garden, GardenMembership, Plot, PlotNote, PlotOwnership


User = get_user_model()


class BaseUserFixtures(TestCase):
    """
    Shared users and dates available to every test class that inherits from
    this class.

    """

    @classmethod
    def setUpTestData(cls):
        super().setUpTestData()

        cls.d1 = datetime.date(2026, 1, 1)
        cls.d2 = datetime.date(2026, 2, 1)
        cls.d3 = datetime.date(2026, 3, 1)
        cls.d4 = datetime.date(2026, 4, 1)

        cls.admin_user = User.objects.create_user(
            username="fixture_admin",
            email="fixture-admin@example.com",
            password="password",
            is_staff=True,
        )

        cls.user_one = User.objects.create_user(
            username="testuser",
            email="testuser@example.com",
            password="password",
        )

        cls.user_two = User.objects.create_user(
            username="coowner",
            email="coowner@example.com",
            password="password",
        )

        cls.user_three = User.objects.create_user(
            username="thirduser",
            email="thirduser@example.com",
            password="password",
        )

        cls.outsider_user = User.objects.create_user(
            username="outsider",
            email="outsider@example.com",
            password="password",
        )


class GardenModelTests(BaseUserFixtures):
    def test_str(self):
        garden = Garden.objects.create(name="Judkins Park P-Patch")

        self.assertEqual(str(garden), "Judkins Park P-Patch")


class GardenMembershipModelTests(BaseUserFixtures):
    def setUp(self):
        self.garden = Garden.objects.create(name="Judkins Park P-Patch")

    def test_defaults_role_and_status(self):
        membership = GardenMembership.objects.create(
            user=self.user_one,
            garden=self.garden,
        )

        self.assertEqual(membership.role, "community_volunteer")
        self.assertEqual(membership.status, "pending")

    def test_unique_membership_per_garden_and_user(self):
        GardenMembership.objects.create(
            user=self.user_one,
            garden=self.garden,
        )

        with self.assertRaises(IntegrityError):
            GardenMembership.objects.create(
                user=self.user_one,
                garden=self.garden,
            )

    def test_user_can_join_multiple_gardens(self):
        other_garden = Garden.objects.create(name="Ballard P-Patch")

        first = GardenMembership.objects.create(
            user=self.user_one,
            garden=self.garden,
        )

        second = GardenMembership.objects.create(
            user=self.user_one,
            garden=other_garden,
        )

        self.assertEqual(first.garden, self.garden)
        self.assertEqual(second.garden, other_garden)


class PlotModelTests(BaseUserFixtures):
    def setUp(self):
        self.garden = Garden.objects.create(name="Judkins Park P-Patch")

    def test_create_plot(self):
        plot = Plot.objects.create(
            garden=self.garden,
            plot_number="1",
        )

        self.assertEqual(plot.plot_number, "1")
        self.assertEqual(plot.garden, self.garden)

    def test_plot_number_unique_within_garden(self):
        Plot.objects.create(
            garden=self.garden,
            plot_number="1",
        )

        with self.assertRaises(IntegrityError):
            Plot.objects.create(
                garden=self.garden,
                plot_number="1",
            )

    def test_plot_number_can_repeat_across_gardens(self):
        other_garden = Garden.objects.create(name="Ballard P-Patch")

        Plot.objects.create(
            garden=self.garden,
            plot_number="1",
        )

        plot = Plot.objects.create(
            garden=other_garden,
            plot_number="1",
        )

        self.assertEqual(plot.garden, other_garden)

    def test_is_active_defaults_to_true(self):
        plot = Plot.objects.create(
            garden=self.garden,
            plot_number="1",
        )

        self.assertTrue(plot.is_active)

    def test_str(self):
        plot = Plot.objects.create(
            garden=self.garden,
            plot_number="3",
        )

        self.assertEqual(
            str(plot),
            "Judkins Park P-Patch - Plot 3",
        )


class PlotOwnershipModelTests(BaseUserFixtures):
    def setUp(self):
        self.garden = Garden.objects.create(name="Judkins Park P-Patch")

        self.plot = Plot.objects.create(
            garden=self.garden,
            plot_number="1",
        )

    def test_create_plot_ownership(self):
        ownership = PlotOwnership.objects.create(
            user=self.user_one,
            plot=self.plot,
            start_date=self.d1,
        )

        self.assertEqual(ownership.user, self.user_one)
        self.assertEqual(ownership.plot, self.plot)

    def test_end_date_can_be_null(self):
        ownership = PlotOwnership.objects.create(
            user=self.user_one,
            plot=self.plot,
            start_date=self.d1,
        )

        self.assertIsNone(ownership.end_date)

    def test_cascade_on_plot_delete(self):
        ownership = PlotOwnership.objects.create(
            user=self.user_one,
            plot=self.plot,
            start_date=self.d1,
        )

        ownership_id = ownership.id
        self.plot.delete()

        self.assertFalse(
            PlotOwnership.objects.filter(id=ownership_id).exists()
        )

    def test_cascade_on_user_delete(self):
        ownership = PlotOwnership.objects.create(
            user=self.user_one,
            plot=self.plot,
            start_date=self.d1,
        )

        ownership_id = ownership.id
        self.user_one.delete()

        self.assertFalse(
            PlotOwnership.objects.filter(id=ownership_id).exists()
        )

    def test_str(self):
        ownership = PlotOwnership.objects.create(
            user=self.user_one,
            plot=self.plot,
            start_date=self.d1,
        )

        self.assertEqual(
            str(ownership),
            "testuser - Judkins Park P-Patch - Plot 1",
        )

    def test_unique_active_ownership_blocks_duplicate_active_row(self):
        PlotOwnership.objects.create(
            user=self.user_one,
            plot=self.plot,
            start_date=self.d1,
        )

        with self.assertRaises(IntegrityError):
            PlotOwnership.objects.create(
                user=self.user_one,
                plot=self.plot,
                start_date=self.d2,
            )

    def test_history_allows_new_active_row_after_previous_ownership_ended(self):
        PlotOwnership.objects.create(
            user=self.user_one,
            plot=self.plot,
            start_date=self.d1,
            end_date=datetime.date(2026, 1, 31),
        )

        current = PlotOwnership.objects.create(
            user=self.user_one,
            plot=self.plot,
            start_date=self.d2,
        )

        self.assertIsNone(current.end_date)

    def test_set_primary_contact_requires_active_owner(self):
        with self.assertRaises(ValidationError):
            PlotOwnership.set_primary_contact(
                self.plot,
                self.user_one,
            )

    def test_set_primary_contact_switches_active_primary(self):
        first = PlotOwnership.objects.create(
            user=self.user_one,
            plot=self.plot,
            start_date=self.d1,
            is_primary=True,
        )

        second = PlotOwnership.objects.create(
            user=self.user_two,
            plot=self.plot,
            start_date=self.d2,
        )

        PlotOwnership.set_primary_contact(
            self.plot,
            self.user_two,
        )

        first.refresh_from_db()
        second.refresh_from_db()

        self.assertFalse(first.is_primary)
        self.assertTrue(second.is_primary)

    def test_ending_primary_promotes_oldest_remaining_active_owner(self):
        first = PlotOwnership.objects.create(
            user=self.user_one,
            plot=self.plot,
            start_date=self.d1,
            is_primary=True,
        )

        second = PlotOwnership.objects.create(
            user=self.user_two,
            plot=self.plot,
            start_date=self.d2,
        )

        promoted = first.end_ownership(
            ended_on=self.d3,
        )

        first.refresh_from_db()
        second.refresh_from_db()

        self.assertEqual(promoted, second)
        self.assertEqual(first.end_date, self.d3)
        self.assertFalse(first.is_primary)
        self.assertTrue(second.is_primary)

    def test_ending_primary_can_use_explicit_replacement(self):
        first = PlotOwnership.objects.create(
            user=self.user_one,
            plot=self.plot,
            start_date=self.d1,
            is_primary=True,
        )

        PlotOwnership.objects.create(
            user=self.user_two,
            plot=self.plot,
            start_date=self.d2,
        )

        third = PlotOwnership.objects.create(
            user=self.user_three,
            plot=self.plot,
            start_date=self.d3,
        )

        promoted = first.end_ownership(
            ended_on=self.d4,
            promote_to_user=self.user_three,
        )

        third.refresh_from_db()

        self.assertEqual(promoted, third)
        self.assertTrue(third.is_primary)

    def test_unique_active_primary_blocks_second_primary(self):
        PlotOwnership.objects.create(
            user=self.user_one,
            plot=self.plot,
            start_date=self.d1,
            is_primary=True,
        )

        with self.assertRaises(IntegrityError):
            PlotOwnership.objects.create(
                user=self.user_two,
                plot=self.plot,
                start_date=self.d2,
                is_primary=True,
            )

    def test_end_date_before_start_date_fails_constraint(self):
        with self.assertRaises(IntegrityError):
            PlotOwnership.objects.create(
                user=self.user_one,
                plot=self.plot,
                start_date=self.d2,
                end_date=self.d1,
            )

    def test_ending_non_primary_returns_none_and_keeps_current_primary(self):
        primary = PlotOwnership.objects.create(
            user=self.user_one,
            plot=self.plot,
            start_date=self.d1,
            is_primary=True,
        )

        secondary = PlotOwnership.objects.create(
            user=self.user_two,
            plot=self.plot,
            start_date=self.d2,
        )

        promoted = secondary.end_ownership(
            ended_on=self.d3,
        )

        primary.refresh_from_db()
        secondary.refresh_from_db()

        self.assertIsNone(promoted)
        self.assertTrue(primary.is_primary)
        self.assertEqual(secondary.end_date, self.d3)

    def test_ending_only_primary_leaves_plot_without_primary(self):
        primary = PlotOwnership.objects.create(
            user=self.user_one,
            plot=self.plot,
            start_date=self.d1,
            is_primary=True,
        )

        promoted = primary.end_ownership(
            ended_on=self.d3,
        )

        primary.refresh_from_db()

        self.assertIsNone(promoted)
        self.assertFalse(primary.is_primary)

        self.assertFalse(
            PlotOwnership.objects.filter(
                plot=self.plot,
                end_date__isnull=True,
                is_primary=True,
            ).exists()
        )

    def test_ending_primary_with_invalid_replacement_raises_validation_error(self):
        primary = PlotOwnership.objects.create(
            user=self.user_one,
            plot=self.plot,
            start_date=self.d1,
            is_primary=True,
        )

        PlotOwnership.objects.create(
            user=self.user_two,
            plot=self.plot,
            start_date=self.d2,
        )

        with self.assertRaises(ValidationError):
            primary.end_ownership(
                ended_on=self.d3,
                promote_to_user=self.outsider_user,
            )


class PlotNoteModelTests(BaseUserFixtures):
    def setUp(self):
        self.garden = Garden.objects.create(name="Judkins Park P-Patch")

        self.plot = Plot.objects.create(
            garden=self.garden,
            plot_number="1",
        )

    def test_create_note(self):
        note = PlotNote.objects.create(
            plot=self.plot,
            author=self.user_one,
            content="Looking good!",
        )

        self.assertEqual(note.content, "Looking good!")

    def test_visibility_defaults_to_this_plot(self):
        note = PlotNote.objects.create(
            plot=self.plot,
            author=self.user_one,
            content="Private note",
        )

        self.assertEqual(note.visibility, "this_plot")

    def test_can_create_plot_stewards_visible_note(self):
        note = PlotNote.objects.create(
            plot=self.plot,
            author=self.user_one,
            content="For stewards",
            visibility="all_plots_in_garden",
        )

        self.assertEqual(
            note.visibility,
            "all_plots_in_garden",
        )

    def test_can_create_garden_visible_note(self):
        note = PlotNote.objects.create(
            plot=self.plot,
            author=self.user_one,
            content="Public",
            visibility="garden_members",
        )

        self.assertEqual(
            note.visibility,
            "garden_members",
        )

    def test_created_at_set_automatically(self):
        before = timezone.now()

        note = PlotNote.objects.create(
            plot=self.plot,
            author=self.user_one,
            content="Test",
        )

        self.assertGreaterEqual(note.created_at, before)

    def test_newest_notes_appear_first(self):
        older = PlotNote.objects.create(
            plot=self.plot,
            author=self.user_one,
            content="Original",
        )

        newer = PlotNote.objects.create(
            plot=self.plot,
            author=self.user_one,
            content="Edited",
        )

        self.assertEqual(
            list(PlotNote.objects.all()),
            [newer, older],
        )

    def test_cascade_on_plot_delete(self):
        note = PlotNote.objects.create(
            plot=self.plot,
            author=self.user_one,
            content="Test",
        )

        note_id = note.id
        self.plot.delete()

        self.assertFalse(
            PlotNote.objects.filter(id=note_id).exists()
        )

    def test_cascade_on_user_delete(self):
        note = PlotNote.objects.create(
            plot=self.plot,
            author=self.user_one,
            content="Test",
        )

        note_id = note.id
        self.user_one.delete()

        self.assertFalse(
            PlotNote.objects.filter(id=note_id).exists()
        )

    def test_str(self):
        note = PlotNote.objects.create(
            plot=self.plot,
            author=self.user_one,
            content="Test",
        )

        self.assertEqual(
            str(note),
            "Note by testuser on Plot 1",
        )