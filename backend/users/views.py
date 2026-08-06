from django.contrib.auth import authenticate
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from .models import User
from .serializers import LoginSerializer, RegisterSerializer, UserSerializer
from .permissions import IsGardenAdmin


class UserListView(generics.ListAPIView):
    # Emails/roles are not public — garden admins only.
    queryset = User.objects.order_by("email")
    serializer_class = UserSerializer
    permission_classes = [IsGardenAdmin]


def tokens_for_user(user):
    refresh = RefreshToken.for_user(user)
    return {
        "refresh": str(refresh),
        "access": str(refresh.access_token),
        "user": UserSerializer(user).data,
    }


class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response(tokens_for_user(user), status=status.HTTP_201_CREATED)


class LoginView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = authenticate(
            request,
            email=serializer.validated_data["email"],
            password=serializer.validated_data["password"],
        )
        if user is None:
            return Response(
                {"detail": "Invalid email or password."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        return Response(tokens_for_user(user))


class MeView(generics.RetrieveAPIView):
    # Pending users must reach /me so the UI can read is_approved.
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = UserSerializer

    def get_object(self):
        return self.request.user


# --- Garden-admin approval loop (list / approve / reject pending users) ---

class PendingUsersView(generics.ListAPIView):
    """GET /api/auth/pending/ — users waiting for approval."""

    permission_classes = [IsGardenAdmin]
    serializer_class = UserSerializer

    def get_queryset(self):
        return User.objects.filter(is_approved=False).order_by("date_joined")


class ApproveUserView(APIView):
    """POST /api/auth/pending/<id>/approve/ — set is_approved=True."""

    permission_classes = [IsGardenAdmin]

    def post(self, request, user_id):
        try:
            user = User.objects.get(pk=user_id)
        except User.DoesNotExist:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        user.is_approved = True
        user.save(update_fields=["is_approved"])
        return Response(UserSerializer(user).data)


class RejectUserView(APIView):
    """POST /api/auth/pending/<id>/reject/ — delete an unapproved signup."""

    permission_classes = [IsGardenAdmin]

    def post(self, request, user_id):
        try:
            user = User.objects.get(pk=user_id, is_approved=False)
        except User.DoesNotExist:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        user.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

