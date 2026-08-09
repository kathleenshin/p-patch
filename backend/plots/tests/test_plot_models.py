from django.db import IntegrityError

from plots.models import Plot

from .test_fixtures import BasePlotTestCase


class PlotModelTests(BasePlotTestCase):
    def test_create_plot(self):
        plot = Plot.objects.create(
            garden=self.garden,
            plot_number="3",
        )

        self.assertEqual(plot.plot_number, "3")
        self.assertEqual(plot.garden, self.garden)

    def test_plot_number_unique_within_garden(self):
        with self.assertRaises(IntegrityError):
            Plot.objects.create(
                garden=self.garden,
                plot_number="1",
            )

    def test_plot_number_can_repeat_across_gardens(self):
        plot = Plot.objects.create(
            garden=self.other_garden,
            plot_number="1",
        )

        self.assertEqual(plot.garden, self.other_garden)

    def test_is_active_defaults_to_true(self):
        plot = Plot.objects.create(
            garden=self.garden,
            plot_number="3",
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