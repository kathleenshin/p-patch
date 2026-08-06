from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any


@dataclass(frozen=True, slots=True)
class EmailDeliveryResult:
    """Represents the outcome of an email delivery attempt."""

    message_id: str | None
    provider_response: dict[str, Any] | None = None


class EmailDeliveryError(RuntimeError):
    """Raised when an email provider cannot deliver a message."""


class EmailProvider(ABC):
    """Interface implemented by email delivery providers."""

    @abstractmethod
    def send_email(
        self,
        *,
        subject: str,
        message: str,
        recipients: list[str],
        sender: str | None = None,
    ) -> EmailDeliveryResult:
        """Send an email through the provider."""

        raise NotImplementedError