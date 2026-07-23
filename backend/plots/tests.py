import datetime
from django.contrib.auth import get_user_model
from django.db import IntegrityError
from django.test import TestCase
from django.utils import timezone

from .models import Plot, PlotNote, PlotOwner

User = get_user_model()


class PlotModelTests(TestCase):
    def test_create_plot(self):
        plot = Plot.objects.create(plot_number=1)
        self.assertEqual(plot.plot_number, 1)

    def test_plot_number_unique(self):
        Plot.objects.create(plot_number=1)
        with self.assertRaises(IntegrityError):
            Plot.objects.create(plot_number=1)

    def test_is_active_defaults_to_true(self):
        plot = Plot.objects.create(plot_number=1)
        self.assertTrue(plot.is_active)

    def test_str(self):
        plot = Plot.objects.create(plot_number=3)
        self.assertEqual(str(plot), "Plot 3")


class PlotOwnerModelTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="testuser", password="password")
        self.plot = Plot.objects.create(plot_number=1)

    def test_create_plot_owner(self):
        owner = PlotOwner.objects.create(
            user=self.user,
            plot=self.plot,
            start_date=datetime.date.today(),
        )
        self.assertEqual(owner.user, self.user)
        self.assertEqual(owner.plot, self.plot)

    def test_end_date_can_be_null(self):
        owner = PlotOwner.objects.create(
            user=self.user,
            plot=self.plot,
            start_date=datetime.date.today(),
        )
        self.assertIsNone(owner.end_date)

    def test_cascade_on_plot_delete(self):
        PlotOwner.objects.create(
            user=self.user,
            plot=self.plot,
            start_date=datetime.date.today(),
        )
        self.plot.delete()
        self.assertEqual(PlotOwner.objects.count(), 0)

    def test_cascade_on_user_delete(self):
        PlotOwner.objects.create(
            user=self.user,
            plot=self.plot,
            start_date=datetime.date.today(),
        )
        self.user.delete()
        self.assertEqual(PlotOwner.objects.count(), 0)

    def test_str(self):
        owner = PlotOwner.objects.create(
            user=self.user,
            plot=self.plot,
            start_date=datetime.date.today(),
        )
        self.assertEqual(str(owner), "testuser - Plot 1")


class PlotNoteModelTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="testuser", password="password")
        self.plot = Plot.objects.create(plot_number=1)

    def test_create_note(self):
        note = PlotNote.objects.create(
            plot=self.plot,
            author=self.user,
            body="Looking good!",
        )
        self.assertEqual(note.body, "Looking good!")

    def test_visibility_defaults_to_private(self):
        note = PlotNote.objects.create(
            plot=self.plot,
            author=self.user,
            body="Private note",
        )
        self.assertEqual(note.visibility, PlotNote.Visibility.PRIVATE)

    def test_can_create_public_note(self):
        note = PlotNote.objects.create(
            plot=self.plot,
            author=self.user,
            body="Public",
            visibility=PlotNote.Visibility.PUBLIC,
        )
        self.assertEqual(note.visibility, PlotNote.Visibility.PUBLIC)

    def test_created_at_set_automatically(self):
        # Compare against a timezone-aware timestamp since created_at is timezone-aware.
        before = timezone.now()
        note = PlotNote.objects.create(
            plot=self.plot,
            author=self.user,
            body="Test",
        )
        self.assertGreaterEqual(note.created_at, before)

    def test_updated_at_changes_on_save(self):
        note = PlotNote.objects.create(
            plot=self.plot,
            author=self.user,
            body="Original",
        )
        original_updated_at = note.updated_at
        note.body = "Edited"
        note.save()
        note.refresh_from_db()  # Re-fetch the note from the database to get the updated timestamp
        self.assertGreater(note.updated_at, original_updated_at)

    def test_cascade_on_plot_delete(self):
        PlotNote.objects.create(plot=self.plot, author=self.user, body="Test")
        self.plot.delete()
        self.assertEqual(PlotNote.objects.count(), 0)

    def test_cascade_on_user_delete(self):
        PlotNote.objects.create(plot=self.plot, author=self.user, body="Test")
        self.user.delete()
        self.assertEqual(PlotNote.objects.count(), 0)

    def test_str(self):
        note = PlotNote.objects.create(
            plot=self.plot,
            author=self.user,
            body="Test",
        )
        self.assertEqual(str(note), "Note by testuser on Plot 1")
