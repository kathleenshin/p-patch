import datetime

from django.core.exceptions import ValidationError
from django.db import IntegrityError

from plots.models import Plot, PlotOwnership

from .test_fixtures import BasePlotTestCase


class PlotOwnershipModelTests(BasePlotTestCase):
    def setUp(self):
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
            PlotOwnership.objects.filter(
                id=ownership_id
            ).exists()
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
            PlotOwnership.objects.filter(
                id=ownership_id
            ).exists()
        )

    def test_str(self):
        ownership = PlotOwnership.objects.create(
            user=self.user_one,
            plot=self.plot,
            start_date=self.d1,
        )

        self.assertEqual(
            str(ownership),
            (
                f"{self.user_one.email} - "
                "Judkins Park P-Patch - Plot 1"
            ),
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

    def test_history_allows_new_active_row_after_previous_ownership_ended(
        self,
    ):
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

    def test_ending_primary_promotes_oldest_remaining_active_owner(
        self,
    ):
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

    def test_ending_non_primary_returns_none_and_keeps_current_primary(
        self,
    ):
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

    def test_ending_primary_with_invalid_replacement_raises_validation_error(
        self,
    ):
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