from django.utils import timezone

from plots.models import PlotNote

from .test_fixtures import BasePlotTestCase


class PlotNoteModelTests(BasePlotTestCase):
    def test_create_note(self):
        note = PlotNote.objects.create(
            plot=self.plot,
            author=self.user_one,
            content="Looking good!",
        )

        self.assertEqual(
            note.content,
            "Looking good!",
        )

    def test_visibility_defaults_to_this_plot(self):
        note = PlotNote.objects.create(
            plot=self.plot,
            author=self.user_one,
            content="Private note",
        )

        self.assertEqual(
            note.visibility,
            "this_plot",
        )

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

        self.assertGreaterEqual(
            note.created_at,
            before,
        )

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
            PlotNote.objects.filter(
                id=note_id
            ).exists()
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
            PlotNote.objects.filter(
                id=note_id
            ).exists()
        )

    def test_str(self):
        note = PlotNote.objects.create(
            plot=self.plot,
            author=self.user_one,
            content="Test",
        )

        self.assertEqual(
            str(note),
            f"Note by {self.user_one.email} on Plot 1",
        )