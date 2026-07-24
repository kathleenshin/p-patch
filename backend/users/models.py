from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    email = models.EmailField(unique=True, blank=False)
    is_approved = models.BooleanField(default=False)
    is_garden_admin = models.BooleanField(default=False)

    def __str__(self):
        return self.username