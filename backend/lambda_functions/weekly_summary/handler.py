def lambda_handler(event, context):
    garden_id = event.get("garden_id")

    return {
        "statusCode": 200,
        "garden_id": garden_id,
        "body": "Weekly summary Lambda is working",
    }