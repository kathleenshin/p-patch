"""API tests for plot photo uploads (local FileSystemStorage in tests)."""

from io import BytesIO

from django.core.files.uploadedfile import SimpleUploadedFile
from django.urls import reverse
from PIL import Image
from rest_framework import status

from plots.models import PlotPhoto

from .test_fixtures import BasePlotAPITestCase


def build_test_image(name="plot.jpg", size=(32, 32), color=(40, 120, 60)):
    """Build a tiny in-memory JPEG for multipart upload tests."""

    buffer = BytesIO()
    Image.new("RGB", size, color=color).save(buffer, format="JPEG")
    return SimpleUploadedFile(
        name,
        buffer.getvalue(),
        content_type="image/jpeg",
    )


class PlotPhotoAPITests(BasePlotAPITestCase):
    def test_unauthenticated_user_cannot_list_photos(self):
        self.client.force_authenticate(user=None)

        response = self.client.get(self.plot_photo_list_create_url)

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_unauthenticated_user_cannot_upload_photo(self):
        self.client.force_authenticate(user=None)

        response = self.client.post(
            self.plot_photo_list_create_url,
            {
                "plot": self.plot.id,
                "image": build_test_image(),
            },
            format="multipart",
        )

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(PlotPhoto.objects.count(), 0)

    def test_authenticated_user_can_upload_photo(self):
        response = self.client.post(
            self.plot_photo_list_create_url,
            {
                "plot": self.plot.id,
                "image": build_test_image(),
                "caption": "Spring seedlings",
            },
            format="multipart",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.json()["caption"], "Spring seedlings")
        self.assertEqual(response.json()["plot"], self.plot.id)
        self.assertTrue(response.json()["image_url"])
        self.assertTrue(
            response.json()["image_url"].startswith("http"),
            msg="image_url should be absolute for the SPA",
        )

        photo = PlotPhoto.objects.get(id=response.json()["id"])
        self.assertEqual(photo.uploaded_by, self.user_one)
        self.assertTrue(photo.image.name.startswith(f"plots/{self.plot.id}/"))

    def test_upload_without_caption_defaults_to_blank(self):
        response = self.client.post(
            self.plot_photo_list_create_url,
            {
                "plot": self.plot.id,
                "image": build_test_image(name="no-caption.jpg"),
            },
            format="multipart",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.json()["caption"], "")

    def test_upload_requires_image(self):
        response = self.client.post(
            self.plot_photo_list_create_url,
            {
                "plot": self.plot.id,
                "caption": "Missing file",
            },
            format="multipart",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("image", response.json())
        self.assertEqual(PlotPhoto.objects.count(), 0)

    def test_list_photos_can_filter_by_plot(self):
        other_plot = self.create_plot("99")
        keep = self.client.post(
            self.plot_photo_list_create_url,
            {
                "plot": self.plot.id,
                "image": build_test_image(name="keep.jpg"),
            },
            format="multipart",
        )
        self.assertEqual(keep.status_code, status.HTTP_201_CREATED)

        other = self.client.post(
            self.plot_photo_list_create_url,
            {
                "plot": other_plot.id,
                "image": build_test_image(name="other.jpg"),
            },
            format="multipart",
        )
        self.assertEqual(other.status_code, status.HTTP_201_CREATED)

        response = self.client.get(
            self.plot_photo_list_create_url,
            {"plot": self.plot.id},
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.json()), 1)
        self.assertEqual(response.json()[0]["id"], keep.json()["id"])

    def test_list_photos_without_filter_returns_all(self):
        self.client.post(
            self.plot_photo_list_create_url,
            {
                "plot": self.plot.id,
                "image": build_test_image(name="one.jpg"),
            },
            format="multipart",
        )
        other_plot = self.create_plot("88")
        self.client.post(
            self.plot_photo_list_create_url,
            {
                "plot": other_plot.id,
                "image": build_test_image(name="two.jpg"),
            },
            format="multipart",
        )

        response = self.client.get(self.plot_photo_list_create_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.json()), 2)

    def test_authenticated_user_can_retrieve_photo(self):
        create_response = self.client.post(
            self.plot_photo_list_create_url,
            {
                "plot": self.plot.id,
                "image": build_test_image(name="detail.jpg"),
                "caption": "Detail view",
            },
            format="multipart",
        )
        photo_id = create_response.json()["id"]
        detail_url = reverse("plot-photo-detail", kwargs={"pk": photo_id})

        response = self.client.get(detail_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.json()["id"], photo_id)
        self.assertEqual(response.json()["caption"], "Detail view")

    def test_authenticated_user_can_delete_photo(self):
        create_response = self.client.post(
            self.plot_photo_list_create_url,
            {
                "plot": self.plot.id,
                "image": build_test_image(name="delete-me.jpg"),
            },
            format="multipart",
        )
        photo_id = create_response.json()["id"]
        detail_url = reverse("plot-photo-detail", kwargs={"pk": photo_id})

        delete_response = self.client.delete(detail_url)

        self.assertEqual(delete_response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(PlotPhoto.objects.filter(id=photo_id).exists())

    def test_unauthenticated_user_cannot_delete_photo(self):
        create_response = self.client.post(
            self.plot_photo_list_create_url,
            {
                "plot": self.plot.id,
                "image": build_test_image(name="locked.jpg"),
            },
            format="multipart",
        )
        photo_id = create_response.json()["id"]
        detail_url = reverse("plot-photo-detail", kwargs={"pk": photo_id})

        self.client.force_authenticate(user=None)
        delete_response = self.client.delete(detail_url)

        self.assertEqual(delete_response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertTrue(PlotPhoto.objects.filter(id=photo_id).exists())
