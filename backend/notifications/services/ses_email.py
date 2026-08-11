"""AWS SES email provider."""

from __future__ import annotations

from collections.abc import Callable
from typing import Any

import boto3
from botocore.exceptions import BotoCoreError, ClientError
from django.conf import settings

from .email_provider import EmailDeliveryError, EmailDeliveryResult, EmailProvider


class SESEmailService(EmailProvider):
    """Email provider backed by AWS SES."""

    def __init__(
        self,
        *,
        sender_email: str | None = None,
        aws_region: str | None = None,
        client_factory: Callable[..., Any] | None = None,
    ) -> None:
        self.sender_email = (
            sender_email
            or settings.NOTIFICATIONS_EMAIL_SENDER
        )
        self.aws_region = (
            aws_region
            or settings.NOTIFICATIONS_AWS_REGION
        )

        factory = client_factory or boto3.client
        self._client = factory("ses", region_name=self.aws_region)

    @classmethod
    def from_settings(
        cls,
        *,
        client_factory: Callable[..., Any] | None = None,
    ) -> "SESEmailService":
        """Create an SES provider using Django settings."""

        return cls(client_factory=client_factory)

    def send_email(
        self,
        *,
        subject: str,
        message: str,
        recipients: list[str],
        sender: str | None = None,
    ) -> EmailDeliveryResult:
        resolved_sender = sender or self.sender_email

        if not resolved_sender:
            raise EmailDeliveryError("Sender email is not configured.")

        if not recipients:
            return EmailDeliveryResult(
                message_id=None,
                provider_response={
                    "skipped": True,
                    "reason": "no_recipients",
                },
            )

        try:
            response = self._client.send_email(
                Source=resolved_sender,
                Destination={"ToAddresses": recipients},
                Message={
                    "Subject": {
                        "Data": subject,
                        "Charset": "UTF-8",
                    },
                    "Body": {
                        "Text": {
                            "Data": message,
                            "Charset": "UTF-8",
                        },
                    },
                },
            )
        except (BotoCoreError, ClientError) as exc:
            detail = "SES could not deliver the email."
            response = getattr(exc, "response", None) or {}
            aws_message = (response.get("Error") or {}).get("Message")
            if aws_message:
                detail = f"{detail} {aws_message}"
            raise EmailDeliveryError(detail) from exc

        return EmailDeliveryResult(
            message_id=response.get("MessageId"),
            provider_response=response,
        )