import json
import os
import urllib.request


BACKEND_URL = os.environ["BACKEND_URL"]
WEBHOOK_TOKEN = os.environ["NOTIFICATIONS_WEBHOOK_TOKEN"]


def lambda_handler(event, context):
    garden_id = event.get("garden_id")

    if garden_id is None:
        return {
            "statusCode": 400,
            "body": "garden_id is required",
        }

    url = f"{BACKEND_URL}/api/notifications/weekly-summary/"

    payload = json.dumps({
        "garden_id": garden_id,
    }).encode("utf-8")

    request = urllib.request.Request(
        url,
        data=payload,
        headers={
            "Content-Type": "application/json",
            "X-Internal-Webhook-Token": WEBHOOK_TOKEN,
        },
        method="POST",
    )

    with urllib.request.urlopen(request) as response:
        body = response.read().decode("utf-8")

    return {
        "statusCode": response.status,
        "garden_id": garden_id,
        "body": body,
    }