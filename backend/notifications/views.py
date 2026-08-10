from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from .permissions import HasWebhookToken
from .serializers import WeeklySummaryRequestSerializer
from .services.email_provider import EmailDeliveryError
from .services.weekly_summary import notify_weekly_summary_for_garden


class WeeklySummaryWebhookView(APIView):
	authentication_classes = []
	permission_classes = [HasWebhookToken]

	def post(self, request):
		serializer = WeeklySummaryRequestSerializer(data=request.data)
		serializer.is_valid(raise_exception=True)

		garden = serializer.validated_data["garden"]

		try:
			notify_weekly_summary_for_garden(garden)
		except EmailDeliveryError as exc:
			return Response(
				{"detail": str(exc)},
				status=status.HTTP_500_INTERNAL_SERVER_ERROR,
			)

		return Response(
			{
				"detail": "Weekly summary notification sent.",
				"garden_id": garden.pk,
			},
			status=status.HTTP_200_OK,
		)
