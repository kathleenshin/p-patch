from datetime import timedelta

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APITestCase

from announcements.models import RETENTION_DAYS, Announcement

User = get_user_model()


class AnnouncementModelTests(TestCase):
    def test_purge_expired_removes_posts_older_than_retention(self):
        admin = User.objects.create_user(
            username="purge-admin",
            email="purge-admin@example.com",
            password="pass12345",
            is_approved=True,
            is_garden_admin=True,
        )
        keep = Announcement.objects.create(body="Still fresh.", author=admin)
        stale = Announcement.objects.create(body="Too old.", author=admin)
        Announcement.objects.filter(pk=stale.pk).update(
            created_at=timezone.now() - timedelta(days=RETENTION_DAYS + 1),
        )

        removed = Announcement.purge_expired()

        self.assertEqual(removed, 1)
        self.assertTrue(Announcement.objects.filter(pk=keep.pk).exists())
        self.assertFalse(Announcement.objects.filter(pk=stale.pk).exists())


class AnnouncementApiTests(APITestCase):
    def setUp(self):
        # Garden admin can POST; member/pending can only GET.
        self.admin = User.objects.create_user(
            username="ann-admin",
            email="ann-admin@example.com",
            password="pass12345",
            first_name="Ada",
            last_name="Lovelace",
            is_approved=True,
            is_garden_admin=True,
        )
        self.member = User.objects.create_user(
            username="ann-member",
            email="ann-member@example.com",
            password="pass12345",
            is_approved=True,
            is_garden_admin=False,
        )
        self.pending = User.objects.create_user(
            username="ann-pending",
            email="ann-pending@example.com",
            password="pass12345",
            is_approved=False,
            is_garden_admin=False,
        )

    def test_anon_cannot_list_or_create(self):
        list_resp = self.client.get("/api/announcements/")
        self.assertEqual(list_resp.status_code, 401)

        create_resp = self.client.post("/api/announcements/", {"body": "Hello"}, format="json")
        self.assertEqual(create_resp.status_code, 401)

    def test_pending_and_member_can_list(self):
        Announcement.objects.create(body="Welcome to the garden.", author=self.admin)

        self.client.force_authenticate(user=self.pending)
        pending_resp = self.client.get("/api/announcements/")
        self.assertEqual(pending_resp.status_code, 200)
        self.assertEqual(len(pending_resp.data), 1)

        self.client.force_authenticate(user=self.member)
        member_resp = self.client.get("/api/announcements/")
        self.assertEqual(member_resp.status_code, 200)
        self.assertEqual(member_resp.data[0]["body"], "Welcome to the garden.")
        self.assertEqual(member_resp.data[0]["author_name"], "Ada Lovelace")
        self.assertEqual(member_resp.data[0]["author_email"], "ann-admin@example.com")

    def test_only_garden_admin_can_create(self):
        self.client.force_authenticate(user=self.member)
        denied = self.client.post("/api/announcements/", {"body": "Nope"}, format="json")
        self.assertEqual(denied.status_code, 403)

        self.client.force_authenticate(user=self.admin)
        created = self.client.post(
            "/api/announcements/",
            {"body": "Work party Saturday."},
            format="json",
        )
        self.assertEqual(created.status_code, 201)
        self.assertEqual(created.data["body"], "Work party Saturday.")
        self.assertEqual(created.data["author"], self.admin.id)
        self.assertEqual(created.data["author_name"], "Ada Lovelace")
        self.assertTrue(Announcement.objects.filter(body="Work party Saturday.").exists())

    def test_list_deletes_posts_older_than_one_month(self):
        # Fresh post stays; backdated post is purged on GET.
        keep = Announcement.objects.create(body="Still fresh.", author=self.admin)
        stale = Announcement.objects.create(body="Too old.", author=self.admin)
        Announcement.objects.filter(pk=stale.pk).update(
            created_at=timezone.now() - timedelta(days=31),
        )

        self.client.force_authenticate(user=self.member)
        resp = self.client.get("/api/announcements/")
        self.assertEqual(resp.status_code, 200)
        bodies = [row["body"] for row in resp.data]
        self.assertIn("Still fresh.", bodies)
        self.assertNotIn("Too old.", bodies)
        self.assertTrue(Announcement.objects.filter(pk=keep.pk).exists())
        self.assertFalse(Announcement.objects.filter(pk=stale.pk).exists())

    def test_create_also_purges_expired_posts(self):
        stale = Announcement.objects.create(body="Expired before post.", author=self.admin)
        Announcement.objects.filter(pk=stale.pk).update(
            created_at=timezone.now() - timedelta(days=RETENTION_DAYS + 1),
        )

        self.client.force_authenticate(user=self.admin)
        created = self.client.post(
            "/api/announcements/",
            {"body": "Brand new post."},
            format="json",
        )

        self.assertEqual(created.status_code, 201)
        self.assertFalse(Announcement.objects.filter(pk=stale.pk).exists())
        self.assertTrue(Announcement.objects.filter(body="Brand new post.").exists())

    def test_author_name_falls_back_to_email(self):
        nameless = User.objects.create_user(
            username="nameless-admin",
            email="nameless@example.com",
            password="pass12345",
            is_approved=True,
            is_garden_admin=True,
        )
        Announcement.objects.create(body="Hello from nameless.", author=nameless)

        self.client.force_authenticate(user=self.member)
        resp = self.client.get("/api/announcements/")
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data[0]["author_name"], "nameless@example.com")
