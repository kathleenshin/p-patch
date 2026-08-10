"""Test settings: in-memory SQLite so tests never touch Neon."""

from .settings import *  # noqa: F403, F401

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": ":memory:",
    }
}

# Never send real emails during tests.
EMAIL_PROVIDER = "console"
# Keep photo uploads on the local filesystem during tests (never hit real S3).
USE_S3 = False
MEDIA_URL = "/media/"
STORAGES = {
    "default": {
        "BACKEND": "django.core.files.storage.FileSystemStorage",
    },
    "staticfiles": {
        "BACKEND": "django.contrib.staticfiles.storage.StaticFilesStorage",
    },
}

# Auth suites register/resend many times from one IP; keep production rates elsewhere.
REST_FRAMEWORK = {
    **REST_FRAMEWORK,  # noqa: F405
    "DEFAULT_THROTTLE_RATES": {
        "auth_register": "1000/min",
        "auth_resend_ip": "1000/min",
        "auth_resend_email": "1000/min",
    },
}