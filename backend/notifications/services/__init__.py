"""Notification service abstractions and provider implementations."""

from .email_provider import EmailDeliveryError, EmailDeliveryResult, EmailProvider
from .notification_service import NotificationService
from .ses_email import SESEmailService

