"""AWS SES email provider.

This module intentionally contains the AWS-specific implementation details and
keeps them separate from notification business logic. Deployment-time concerns
such as IAM permissions, verified sender identities, region selection,
environment variables, and AWS credentials are expected to be wired in later
through Django settings and the deployment environment.
"""

from __future__ import annotations

from collections.abc import Callable
from typing import Any

from django.conf import settings

try:  # pragma: no cover - used when boto3 is installed in the environment.
    import boto3
except ImportError:  # pragma: no cover - keeps the module importable in tests.
    class _MissingBoto3:
        def client(self, *args: Any, **kwargs: Any) -> Any:
            raise ImportError("boto3 is required to use the SES email provider.")

    boto3 = _MissingBoto3()

try:  # pragma: no cover - used when botocore is installed.
    from botocore.exceptions import BotoCoreError, ClientError
except ImportError:  # pragma: no cover - keeps the module importable in tests.
    class BotoCoreError(Exception):
        """Fallback boto core error used when botocore is unavailable."""

    class ClientError(Exception):
        """Fallback client error used when botocore is unavailable."""

from .email_provider import EmailDeliveryError, EmailDeliveryResult, EmailProvider


class SESEmailService(EmailProvider):
    """Email provider backed by AWS SES.

    The service accepts optional overrides so tests can inject a mocked client
    factory without touching AWS. Real deployments should provide sender and
    region configuration through Django settings.
    """

    def __init__(
        self,
        *,
        sender_email: str | None = None,
        aws_region: str | None = None,
        client_factory: Callable[..., Any] | None = None,
    ) -> None:
        client_factory = client_factory or boto3.client
        self.sender_email = sender_email or getattr(settings, "NOTIFICATIONS_EMAIL_SENDER", None)
        self.aws_region = aws_region or getattr(settings, "NOTIFICATIONS_AWS_REGION", None)
        self._client = client_factory("ses", region_name=self.aws_region)

    @classmethod
    def from_settings(
        cls,
        *,
        client_factory: Callable[..., Any] | None = None,
    ) -> "SESEmailService":
        """Create an SES provider using the current Django settings."""

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
                    "Subject": {"Data": subject, "Charset": "UTF-8"},
                    "Body": {
                        "Text": {"Data": message, "Charset": "UTF-8"},
                    },
                },
            )
        except (BotoCoreError, ClientError) as exc:
            raise EmailDeliveryError("SES could not deliver the email.") from exc

        return EmailDeliveryResult(
            message_id=response.get("MessageId"),
            provider_response=response,
        )
