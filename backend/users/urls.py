from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from .views import (
    ApproveUserView,
    LoginView,
    MeView,
    PendingUsersView,
    RegisterView,
    RejectUserView,
    UserListView
)


urlpatterns = [
    path("register/", RegisterView.as_view(), name="auth-register"),
    path("login/", LoginView.as_view(), name="auth-login"),
    path("refresh/", TokenRefreshView.as_view(), name="auth-refresh"),
    path("me/", MeView.as_view(), name="auth-me"),

    # Garden-admin only: pending registrations and users list
    path("pending/", PendingUsersView.as_view(), name="auth-pending"),
    path("pending/<int:user_id>/approve/", ApproveUserView.as_view(), name="auth-approve"),
    path("pending/<int:user_id>/reject/", RejectUserView.as_view(), name="auth-reject"),
    path("users/", UserListView.as_view(), name="auth-users"),

]
