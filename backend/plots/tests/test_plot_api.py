from django.db import connection
from django.test.utils import CaptureQueriesContext

from help_requests.models import HelpRequest
from plots.models import Plot
from plots.models import PlotOwnership

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

    def test_plot_detail_includes_owners_and_help_request_flags(self):
        self.user_one.is_approved = True
        self.user_one.save(update_fields=["is_approved"])

        PlotOwnership.objects.create(
            user=self.user_one,
            plot=self.plot,
            is_primary=True,
            start_date=self.d1,
        )

        HelpRequest.objects.create(
            title="Need watering help",
            description="Out of town for a week.",
            status=HelpRequest.Status.ACTIVE,
            garden=self.garden,
            plot=self.plot,
            created_by=self.user_one,
        )

        response = self.client.get(self.plot_detail_url)

        self.assertEqual(response.status_code, 200)
        payload = response.json()

        self.assertTrue(payload["has_open_help_request"])
        self.assertTrue(payload["is_mine"])
        self.assertEqual(len(payload["owners"]), 1)
        self.assertEqual(
            payload["owners"][0]["id"],
            self.user_one.id,
        )
        self.assertTrue(payload["owners"][0]["is_primary"])

    def test_plot_list_query_count_does_not_scale_linearly_with_plot_count(self):
        self.user_one.is_approved = True
        self.user_one.save(update_fields=["is_approved"])

        PlotOwnership.objects.create(
            user=self.user_one,
            plot=self.plot,
            is_primary=True,
            start_date=self.d1,
        )
        HelpRequest.objects.create(
            title="Initial request",
            description="Baseline row",
            status=HelpRequest.Status.ACTIVE,
            garden=self.garden,
            plot=self.plot,
            created_by=self.user_one,
        )

        with CaptureQueriesContext(connection) as baseline_ctx:
            baseline_response = self.client.get(
                self.plot_list_create_url
            )

        self.assertEqual(baseline_response.status_code, 200)
        baseline_count = len(baseline_ctx)

        for idx in range(2, 19):
            plot = Plot.objects.create(
                garden=self.garden,
                plot_number=str(idx),
            )
            PlotOwnership.objects.create(
                user=self.user_one,
                plot=plot,
                is_primary=True,
                start_date=self.d1,
            )
            HelpRequest.objects.create(
                title=f"Request {idx}",
                description="Coverage row",
                status=HelpRequest.Status.ACTIVE,
                garden=self.garden,
                plot=plot,
                created_by=self.user_one,
            )

        with CaptureQueriesContext(connection) as expanded_ctx:
            expanded_response = self.client.get(
                self.plot_list_create_url
            )

        self.assertEqual(expanded_response.status_code, 200)

        # Query count should stay effectively constant as list size grows.
        self.assertLessEqual(
            len(expanded_ctx),
            baseline_count + 3,
        )