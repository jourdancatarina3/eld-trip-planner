from django.conf import settings
from rest_framework.response import Response
from rest_framework.views import APIView


class HealthView(APIView):
    def get(self, request):
        return Response({"status": "ok", "mock_apis": settings.USE_MOCK_APIS})
