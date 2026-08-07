from plots.models import PlotNote

from .test_fixtures import BasePlotAPITestCase


class PlotNoteAPITests(BasePlotAPITestCase):

    def test_plot_query_parameter_filters_notes_by_plot(self):
        response = self.client.get(
            self.plot_note_list_create_url,
            {"plot": self.plot.id},
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.json()), 1)
        self.assertEqual(
            response.json()[0]["id"],
            self.note.id,
        )
        self.assertEqual(
            response.json()[0]["plot"],
            self.plot.id,
        )

    def test_unauthenticated_user_cannot_list_notes(self):
        self.client.force_authenticate(user=None)

        response = self.client.get(
            self.plot_note_list_create_url
        )

        self.assertEqual(response.status_code, 401)

    def test_authenticated_user_can_list_notes(self):
        response = self.client.get(
            self.plot_note_list_create_url
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.json()), 1)
        self.assertEqual(
            response.json()[0]["content"],
            "Tomatoes were watered.",
        )

    def test_authenticated_user_can_retrieve_note(self):
        response = self.client.get(
            self.plot_note_detail_url
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.json()["id"],
            self.note.id,
        )
        self.assertEqual(
            response.json()["plot"],
            self.plot.id,
        )
        self.assertEqual(
            response.json()["content"],
            "Tomatoes were watered.",
        )

    def test_authenticated_user_can_create_note(self):
        response = self.client.post(
            self.plot_note_list_create_url,
            self.create_plot_note_payload,
            format="json",
        )

        self.assertEqual(response.status_code, 201)

        self.assertTrue(
            PlotNote.objects.filter(
                plot=self.plot,
                content="The beans need support.",
            ).exists()
        )

    def test_created_note_uses_authenticated_user_as_author(self):
        response = self.client.post(
            self.plot_note_list_create_url,
            self.create_plot_note_payload,
            format="json",
        )

        self.assertEqual(response.status_code, 201)

        created_note = PlotNote.objects.get(
            id=response.json()["id"]
        )

        self.assertEqual(
            created_note.author,
            self.user_one,
        )

    def test_client_cannot_assign_different_author(self):
        payload = {
            **self.create_plot_note_payload,
            "author": self.user_two.id,
        }

        response = self.client.post(
            self.plot_note_list_create_url,
            payload,
            format="json",
        )

        self.assertEqual(response.status_code, 201)

        created_note = PlotNote.objects.get(
            id=response.json()["id"]
        )

        self.assertEqual(
            created_note.author,
            self.user_one,
        )
        self.assertNotEqual(
            created_note.author,
            self.user_two,
        )

    def test_authenticated_user_can_update_note_content(self):
        response = self.client.patch(
            self.plot_note_detail_url,
            {
                "content": "Tomatoes were watered twice.",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 200)

        self.note.refresh_from_db()
        self.assertEqual(
            self.note.content,
            "Tomatoes were watered twice.",
        )

    def test_authenticated_user_can_update_note_visibility(self):
        response = self.client.patch(
            self.plot_note_detail_url,
            {
                "visibility": "garden_members",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 200)

        self.note.refresh_from_db()
        self.assertEqual(
            self.note.visibility,
            "garden_members",
        )

    def test_authenticated_user_can_delete_note(self):
        note_id = self.note.id

        response = self.client.delete(
            self.plot_note_detail_url
        )

        self.assertEqual(response.status_code, 204)

        self.assertFalse(
            PlotNote.objects.filter(
                id=note_id,
            ).exists()
        )

    def test_invalid_visibility_is_rejected(self):
        response = self.client.post(
            self.plot_note_list_create_url,
            self.invalid_visibility_payload,
            format="json",
        )

        self.assertEqual(response.status_code, 400)

        self.assertFalse(
            PlotNote.objects.filter(
                content="Invalid visibility test.",
            ).exists()
        )

    def test_content_is_required(self):
        response = self.client.post(
            self.plot_note_list_create_url,
            {
                "plot": self.plot.id,
                "visibility": "this_plot",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 400)

    def test_plot_is_required(self):
        response = self.client.post(
            self.plot_note_list_create_url,
            {
                "content": "Missing plot test.",
                "visibility": "this_plot",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 400)

    def test_unknown_note_returns_404(self):
        response = self.client.get(
            self.unknown_plot_note_detail_url
        )

        self.assertEqual(response.status_code, 404)