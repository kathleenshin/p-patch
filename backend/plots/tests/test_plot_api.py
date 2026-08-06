from plots.models import Plot

from .test_fixtures import BasePlotAPITestCase


class PlotAPITests(BasePlotAPITestCase):

    def test_unauthenticated_user_cannot_list_plots(self):
        self.client.force_authenticate(user=None)

        response = self.client.get(self.plot_list_create_url)

        self.assertEqual(response.status_code, 401)

    def test_authenticated_user_can_list_plots(self):
        response = self.client.get(self.plot_list_create_url)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.json()), 1)
        self.assertEqual(
            response.json()[0]["plot_number"],
            "1",
        )

    def test_authenticated_user_can_retrieve_plot(self):
        response = self.client.get(self.plot_detail_url)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.json()["id"],
            self.plot.id,
        )
        self.assertEqual(
            response.json()["garden"],
            self.garden.id,
        )

    def test_authenticated_user_can_create_plot(self):
        response = self.client.post(
            self.plot_list_create_url,
            self.create_plot_payload,
            format="json",
        )

        self.assertEqual(response.status_code, 201)

        self.assertTrue(
            Plot.objects.filter(
                garden=self.garden,
                plot_number="2",
            ).exists()
        )

    def test_authenticated_user_can_update_plot(self):
        response = self.client.patch(
            self.plot_detail_url,
            {
                "is_active": False,
            },
            format="json",
        )

        self.assertEqual(response.status_code, 200)

        self.plot.refresh_from_db()
        self.assertFalse(self.plot.is_active)

    def test_plot_detail_does_not_allow_delete(self):
        response = self.client.delete(self.plot_detail_url)

        self.assertEqual(response.status_code, 405)

        self.assertTrue(
            Plot.objects.filter(
                pk=self.plot.pk,
            ).exists()
        )

    def test_duplicate_plot_number_in_same_garden_is_rejected(
        self,
    ):
        response = self.client.post(
            self.plot_list_create_url,
            self.duplicate_plot_payload,
            format="json",
        )

        self.assertEqual(response.status_code, 400)

    def test_same_plot_number_in_different_garden_is_allowed(
        self,
    ):
        response = self.client.post(
            self.plot_list_create_url,
            self.other_garden_plot_payload,
            format="json",
        )

        self.assertEqual(response.status_code, 201)

    def test_unknown_plot_returns_404(self):
        response = self.client.get(
            self.unknown_plot_detail_url
        )

        self.assertEqual(response.status_code, 404)