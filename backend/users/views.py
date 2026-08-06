from django.contrib.auth import authenticate
from django.utils.encoding import force_str
from django.utils.http import urlsafe_base64_decode
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from .email_confirmation import send_confirmation_email
from .models import User
from .permissions import IsGardenAdmin
from .serializers import (
    ConfirmEmailSerializer,
    LoginSerializer,
    RegisterSerializer,
    ResendConfirmationSerializer,
    UserSerializer,
)
from .throttles import (
    AuthRegisterThrottle,
    AuthResendEmailThrottle,
    AuthResendIPThrottle,
)
from .tokens import email_confirmation_token


class UserListView(generics.ListAPIView):
    queryset = User.objects.order_by("email")
    serializer_class = UserSerializer
    permission_classes = [permissions.AllowAny]


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
    throttle_classes = [AuthRegisterThrottle]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        send_confirmation_email(user)
        return Response(
            {
                "detail": (
                    "Account created. Check your email to confirm your address "
                    "before logging in."
                ),
                "email": user.email,
            },
            status=status.HTTP_201_CREATED,
        )


class ConfirmEmailView(APIView):
    """POST /api/auth/confirm-email/ — activate account from email link tokens."""

    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = ConfirmEmailSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        uid = serializer.validated_data["uid"]
        token = serializer.validated_data["token"]

        try:
            user_id = force_str(urlsafe_base64_decode(uid))
            user = User.objects.get(pk=user_id)
        except (TypeError, ValueError, OverflowError, User.DoesNotExist):
            return Response(
                {"detail": "Invalid confirmation link."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not user.is_active:
            if not email_confirmation_token.check_token(user, token):
                return Response(
                    {"detail": "Invalid or expired confirmation link."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            user.is_active = True
            user.save(update_fields=["is_active"])

        # Confirmed users can enter as pending (is_approved may still be False).
        return Response(tokens_for_user(user))


class ResendConfirmationView(APIView):
    """POST /api/auth/resend-confirmation/ — resend verify email if still inactive."""

    permission_classes = [permissions.AllowAny]
    throttle_classes = [AuthResendIPThrottle, AuthResendEmailThrottle]

    def post(self, request):
        serializer = ResendConfirmationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data["email"]

        # Same response either way to avoid leaking which emails exist.
        detail = {
            "detail": (
                "If an unconfirmed account exists for that email, "
                "a new confirmation link has been sent."
            ),
        }
        try:
            user = User.objects.get(email__iexact=email, is_active=False)
        except User.DoesNotExist:
            return Response(detail, status=status.HTTP_200_OK)

        send_confirmation_email(user)
        return Response(detail, status=status.HTTP_200_OK)


class LoginView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data["email"]
        password = serializer.validated_data["password"]

        user = authenticate(request, email=email, password=password)
        if user is not None:
            return Response(tokens_for_user(user))

        # authenticate() returns None for inactive users even with a valid password.
        try:
            existing = User.objects.get(email__iexact=email)
        except User.DoesNotExist:
            existing = None

        if existing is not None and not existing.is_active and existing.check_password(password):
            return Response(
                {
                    "detail": (
                        "Please confirm your email before logging in. "
                        "Check your inbox for the confirmation link."
                    ),
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        return Response(
            {"detail": "Invalid email or password."},
            status=status.HTTP_401_UNAUTHORIZED,
        )


class MeView(generics.RetrieveAPIView):
    serializer_class = UserSerializer

    def get_object(self):
        return self.request.user


# --- Garden-admin approval loop (list / approve / reject pending users) ---

class PendingUsersView(generics.ListAPIView):
    """GET /api/auth/pending/ — email-confirmed users waiting for garden approval."""

    permission_classes = [IsGardenAdmin]
    serializer_class = UserSerializer

    def get_queryset(self):
        return User.objects.filter(
            is_approved=False,
            is_active=True,
        ).order_by("date_joined")


class ApproveUserView(APIView):
    """POST /api/auth/pending/<id>/approve/ — set is_approved=True."""

    permission_classes = [IsGardenAdmin]

    def post(self, request, user_id):
        try:
            user = User.objects.get(pk=user_id, is_active=True)
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
            user = User.objects.get(pk=user_id, is_approved=False, is_active=True)
        except User.DoesNotExist:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        user.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
