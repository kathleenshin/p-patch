import datetime

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken
from unittest.mock import patch

from plots.models import Garden, Plot

from .models import HelpRequest


User = get_user_model()


class HelpRequestAPITests(APITestCase):
    @classmethod
    def setUpTestData(cls):
        cls.user = User.objects.create_user(
            username="apiuser",
            email="apiuser@example.com",
            password="password",
            is_approved=True,
        )
        cls.pending_user = User.objects.create_user(
            email="pending-api@example.com",
            password="password",
            is_approved=False,
        )

        cls.garden = Garden.objects.create(name="Green Street Garden")
        cls.plot = Plot.objects.create(garden=cls.garden, plot_number="2")

    def setUp(self):
        self.client.credentials(
            HTTP_AUTHORIZATION=f"Bearer {RefreshToken.for_user(self.user).access_token}"
        )

    def test_assignee_list_returns_approved_users_only(self):
        approved_member = User.objects.create_user(
            email="member@example.com",
            password="password",
            first_name="Mina",
            last_name="Member",
            is_approved=True,
        )
        User.objects.create_user(
            email="pending@example.com",
            password="password",
            first_name="Pat",
            last_name="Pending",
            is_approved=False,
        )

        self.client.credentials(
            HTTP_AUTHORIZATION=f"Bearer {RefreshToken.for_user(approved_member).access_token}"
        )

        response = self.client.get(reverse("help-request-assignees"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            [row["email"] for row in response.data],
            ["apiuser@example.com", "member@example.com"],
        )

    def test_assignee_list_rejects_pending_users(self):
        pending = User.objects.create_user(
            email="pending-only@example.com",
            password="password",
            is_approved=False,
        )
        self.client.credentials(
            HTTP_AUTHORIZATION=f"Bearer {RefreshToken.for_user(pending).access_token}"
        )

        response = self.client.get(reverse("help-request-assignees"))

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_list_help_requests(self):
        HelpRequest.objects.create(
            title="Water beds",
            description="Water the raised beds before noon.",
            garden=self.garden,
            plot=self.plot,
            created_by=self.user,
        )

        response = self.client.get(reverse("help-request-list"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["title"], "Water beds")

    def test_old_unclaimed_help_request_is_excluded_from_list(self):
        help_request = HelpRequest.objects.create(
            title="Old unclaimed task",
            description="Nobody picked this up.",
            garden=self.garden,
            created_by=self.user,
        )

        HelpRequest.objects.filter(pk=help_request.pk).update(
            created_at=timezone.now() - datetime.timedelta(days=15)
        )

        response = self.client.get(reverse("help-request-list"))

        returned_ids = [row["id"] for row in response.data]

        self.assertNotIn(help_request.id, returned_ids)

    def test_create_help_request(self):
        response = self.client.post(
            reverse("help-request-list"),
            {
                "title": "Repair shed",
                "description": "Fix the loose hinge on the shed door.",
                "garden": self.garden.id,
                "plot": self.plot.id,
                "priority": HelpRequest.Priority.HIGH,
                "category": HelpRequest.Category.MAINTENANCE,
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(HelpRequest.objects.count(), 1)
        self.assertEqual(response.data["title"], "Repair shed")
        self.assertEqual(response.data["created_by"], self.user.id)

    def test_create_help_request_with_plot_number(self):
        response = self.client.post(
            reverse("help-request-list"),
            {
                "title": "Need mulch",
                "description": "Need help adding mulch before rain.",
                "garden": self.garden.id,
                "plot_number": self.plot.plot_number,
                "priority": HelpRequest.Priority.MEDIUM,
                "category": HelpRequest.Category.GARDENING,
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["plot"], self.plot.id)

    def test_create_help_request_rejects_unknown_plot_number(self):
        response = self.client.post(
            reverse("help-request-list"),
            {
                "title": "Need tool",
                "description": "Missing rake.",
                "garden": self.garden.id,
                "plot_number": "999",
                "priority": HelpRequest.Priority.LOW,
                "category": HelpRequest.Category.OTHER,
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("plot_number", response.data)

    def test_create_help_request_rejects_conflicting_plot_and_plot_number(self):
        other_plot = Plot.objects.create(garden=self.garden, plot_number="3")

        response = self.client.post(
            reverse("help-request-list"),
            {
                "title": "Fence help",
                "description": "Fence repair help needed.",
                "garden": self.garden.id,
                "plot": other_plot.id,
                "plot_number": self.plot.plot_number,
                "priority": HelpRequest.Priority.HIGH,
                "category": HelpRequest.Category.MAINTENANCE,
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("plot", response.data)

    def test_partial_update_help_request_plot_with_plot_number(self):
        help_request = HelpRequest.objects.create(
            title="Move compost",
            description="Move compost to beds.",
            garden=self.garden,
            plot=self.plot,
            created_by=self.user,
        )
        other_plot = Plot.objects.create(garden=self.garden, plot_number="7")

        response = self.client.patch(
            reverse("help-request-detail", kwargs={"pk": help_request.id}),
            {
                "plot_number": other_plot.plot_number,
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["plot"], other_plot.id)

    def test_help_requests_require_authentication(self):
        help_request = HelpRequest.objects.create(
            title="Repair fence",
            description="Fix the loose fence near the main gate.",
            garden=self.garden,
            plot=self.plot,
            created_by=self.user,
        )

        self.client.credentials()

        list_response = self.client.get(reverse("help-request-list"))
        self.assertEqual(list_response.status_code, status.HTTP_401_UNAUTHORIZED)

        create_response = self.client.post(
            reverse("help-request-list"),
            {
                "title": "Repair fence",
                "description": "Fix the loose fence near the main gate.",
                "garden": self.garden.id,
                "plot": self.plot.id,
                "priority": HelpRequest.Priority.HIGH,
                "category": HelpRequest.Category.MAINTENANCE,
            },
            format="json",
        )
        self.assertEqual(create_response.status_code, status.HTTP_401_UNAUTHORIZED)

        detail_response = self.client.get(reverse("help-request-detail", kwargs={"pk": help_request.id}))
        self.assertEqual(detail_response.status_code, status.HTTP_401_UNAUTHORIZED)

        update_response = self.client.patch(
            reverse("help-request-detail", kwargs={"pk": help_request.id}),
            {"status": HelpRequest.Status.PENDING},
            format="json",
        )
        self.assertEqual(update_response.status_code, status.HTTP_401_UNAUTHORIZED)

        delete_response = self.client.delete(reverse("help-request-detail", kwargs={"pk": help_request.id}))
        self.assertEqual(delete_response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_help_requests_require_approved_user(self):
        help_request = HelpRequest.objects.create(
            title="Path cleanup",
            description="Sweep debris near garden entrance.",
            garden=self.garden,
            plot=self.plot,
            created_by=self.user,
        )

        self.client.credentials(
            HTTP_AUTHORIZATION=f"Bearer {RefreshToken.for_user(self.pending_user).access_token}"
        )

        list_response = self.client.get(reverse("help-request-list"))
        self.assertEqual(list_response.status_code, status.HTTP_403_FORBIDDEN)

        create_response = self.client.post(
            reverse("help-request-list"),
            {
                "title": "Need shovels",
                "description": "Need extra shovels for volunteers.",
                "garden": self.garden.id,
                "plot": self.plot.id,
                "priority": HelpRequest.Priority.MEDIUM,
                "category": HelpRequest.Category.OTHER,
            },
            format="json",
        )
        self.assertEqual(create_response.status_code, status.HTTP_403_FORBIDDEN)

        detail_response = self.client.get(reverse("help-request-detail", kwargs={"pk": help_request.id}))
        self.assertEqual(detail_response.status_code, status.HTTP_403_FORBIDDEN)

        update_response = self.client.patch(
            reverse("help-request-detail", kwargs={"pk": help_request.id}),
            {"status": HelpRequest.Status.PENDING},
            format="json",
        )
        self.assertEqual(update_response.status_code, status.HTTP_403_FORBIDDEN)

        delete_response = self.client.delete(reverse("help-request-detail", kwargs={"pk": help_request.id}))
        self.assertEqual(delete_response.status_code, status.HTTP_403_FORBIDDEN)

    def test_retrieve_update_and_delete_help_request(self):
        help_request = HelpRequest.objects.create(
            title="Weed paths",
            description="Remove weeds from the community paths.",
            garden=self.garden,
            plot=self.plot,
            created_by=self.user,
        )

        retrieve_response = self.client.get(
            reverse("help-request-detail", kwargs={"pk": help_request.id})
        )
        self.assertEqual(retrieve_response.status_code, status.HTTP_200_OK)
        self.assertEqual(retrieve_response.data["title"], "Weed paths")

        update_response = self.client.patch(
            reverse("help-request-detail", kwargs={"pk": help_request.id}),
            {"status": HelpRequest.Status.PENDING},
            format="json",
        )
        self.assertEqual(update_response.status_code, status.HTTP_200_OK)
        self.assertEqual(update_response.data["status"], HelpRequest.Status.PENDING)

        delete_response = self.client.delete(
            reverse("help-request-detail", kwargs={"pk": help_request.id})
        )
        self.assertEqual(delete_response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(HelpRequest.objects.filter(id=help_request.id).exists())


class HelpRequestModelTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.creator = User.objects.create_user(
            email="creator@example.com",
            password="password",
        )

        cls.assignee = User.objects.create_user(
            email="assignee@example.com",
            password="password",
        )

        cls.garden = Garden.objects.create(
            name="Judkins Park P-Patch",
        )

        cls.plot = Plot.objects.create(
            garden=cls.garden,
            plot_number="1",
        )

        cls.help_request = HelpRequest.objects.create(
            title="Repair fence",
            description="Repair the damaged fence near Plot 1.",
            garden=cls.garden,
            plot=cls.plot,
            created_by=cls.creator,
            priority=HelpRequest.Priority.HIGH,
            category=HelpRequest.Category.MAINTENANCE,
        )

    def test_create_help_request(self):
        self.assertEqual(
            self.help_request.title,
            "Repair fence",
        )
        self.assertEqual(
            self.help_request.description,
            "Repair the damaged fence near Plot 1.",
        )
        self.assertEqual(
            self.help_request.garden,
            self.garden,
        )
        self.assertEqual(
            self.help_request.plot,
            self.plot,
        )
        self.assertEqual(
            self.help_request.created_by,
            self.creator,
        )

    def test_status_defaults_to_active(self):
        self.assertEqual(
            self.help_request.status,
            HelpRequest.Status.ACTIVE,
        )

    def test_priority_defaults_to_medium(self):
        help_request = HelpRequest.objects.create(
            title="Clean shed",
            description="Clean the shared garden shed.",
            garden=self.garden,
            created_by=self.creator,
        )

        self.assertEqual(
            help_request.priority,
            HelpRequest.Priority.MEDIUM,
        )

    def test_category_defaults_to_other(self):
        help_request = HelpRequest.objects.create(
            title="General garden task",
            description="Help with a general garden task.",
            garden=self.garden,
            created_by=self.creator,
        )

        self.assertEqual(
            help_request.category,
            HelpRequest.Category.OTHER,
        )

    def test_plot_is_optional(self):
        help_request = HelpRequest.objects.create(
            title="Clean shed",
            description="Clean the shared garden shed.",
            garden=self.garden,
            created_by=self.creator,
        )

        self.assertIsNone(help_request.plot)

    def test_assigned_to_is_optional(self):
        self.assertIsNone(self.help_request.assigned_to)

    def test_due_date_is_optional(self):
        self.assertIsNone(self.help_request.due_date)

    def test_completed_at_is_optional(self):
        self.assertIsNone(self.help_request.completed_at)

    def test_help_request_can_be_assigned(self):
        self.help_request.assigned_to = self.assignee
        self.help_request.status = HelpRequest.Status.PENDING
        self.help_request.save()

        self.assertEqual(
            self.help_request.assigned_to,
            self.assignee,
        )
        self.assertEqual(
            self.help_request.status,
            HelpRequest.Status.PENDING,
        )

    def test_help_request_can_have_due_date(self):
        due_date = datetime.date(2026, 8, 15)

        self.help_request.due_date = due_date
        self.help_request.save()

        self.assertEqual(
            self.help_request.due_date,
            due_date,
        )

    def test_help_request_tracks_created_by(self):
        self.assertEqual(
            self.help_request.created_by,
            self.creator,
        )

    def test_help_request_can_be_completed(self):
        completed_at = timezone.now()

        self.help_request.status = HelpRequest.Status.DONE
        self.help_request.completed_at = completed_at
        self.help_request.save()

        self.assertEqual(
            self.help_request.status,
            HelpRequest.Status.DONE,
        )
        self.assertEqual(
            self.help_request.completed_at,
            completed_at,
        )

    def test_help_request_remains_when_creator_is_deleted(self):
        help_request_id = self.help_request.id

        self.creator.delete()

        help_request = HelpRequest.objects.get(id=help_request_id)

        self.assertIsNone(help_request.created_by)

    def test_help_request_remains_when_assignee_is_deleted(self):
        self.help_request.assigned_to = self.assignee
        self.help_request.status = HelpRequest.Status.PENDING
        self.help_request.save()

        help_request_id = self.help_request.id
        self.assignee.delete()

        help_request = HelpRequest.objects.get(id=help_request_id)

        self.assertIsNone(help_request.assigned_to)

    def test_plot_deletion_does_not_delete_help_request(self):
        help_request_id = self.help_request.id

        self.plot.delete()

        help_request = HelpRequest.objects.get(id=help_request_id)

        self.assertIsNone(help_request.plot)

    def test_garden_deletion_deletes_help_request(self):
        help_request_id = self.help_request.id

        self.garden.delete()

        self.assertFalse(
            HelpRequest.objects.filter(id=help_request_id).exists()
        )

    def test_str(self):
        self.assertEqual(
            str(self.help_request),
            "Repair fence",
        )

# Mock the notification so tests don't send real emails
@patch("help_requests.views.notify_urgent_help_request")
def test_high_priority_help_request_sends_notification(self, mock_notify):
    self.client.force_authenticate(user=self.user)

    response = self.client.post(
        reverse("help-request-list"),
        {
            "title": "Urgent watering",
            "description": "Plants need water immediately.",
            "garden": self.garden.id,
            "priority": HelpRequest.Priority.HIGH,
            "category": HelpRequest.Category.WATERING,
        },
        format="json",
    )

    self.assertEqual(
        response.status_code,
        status.HTTP_201_CREATED,
    )

    help_request = HelpRequest.objects.get(
        id=response.data["id"],
    )

    mock_notify.assert_called_once_with(help_request)

    self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    help_request = HelpRequest.objects.get(id=response.data["id"])
    mock_notify.assert_called_once_with(help_request)


@patch("help_requests.views.notify_urgent_help_request")
def test_medium_priority_help_request_does_not_send_notification(
    self,
    mock_notify,
):
    self.client.force_authenticate(user=self.user)

    response = self.client.post(
        reverse("help-request-list"),
        {
            "title": "Weeding help",
            "description": "Need help weeding this week.",
            "garden": self.garden.id,
            "priority": HelpRequest.Priority.MEDIUM,
            "category": HelpRequest.Category.GARDENING,
        },
        format="json",
    )

    self.assertEqual(
        response.status_code,
        status.HTTP_201_CREATED,
    )

    mock_notify.assert_not_called()