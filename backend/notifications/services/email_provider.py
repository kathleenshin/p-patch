from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any


@dataclass(frozen=True, slots=True)
class EmailDeliveryResult:
    # Represents the outcome of a notification email delivery attempt.

    message_id: str | None
    provider_response: dict[str, Any] | None = None


class EmailDeliveryError(RuntimeError):
    # Raised when the configured email provider cannot deliver a message.
    pass

class EmailProvider(ABC):

    @abstractmethod
    def send_email(
        self,
        *,
        subject: str,
        message: str,
        recipients: list[str],
        sender: str | None = None,
    ) -> EmailDeliveryResult:
        raise NotImplementedError