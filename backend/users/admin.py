from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import User


@admin.register(User)
class CustomUserAdmin(UserAdmin):
    fieldsets = UserAdmin.fieldsets + (
        (
            "Garden Permissions",
            {
                "fields": (
                    "is_approved",
                    "is_garden_admin",
                )
            },
        ),
    )