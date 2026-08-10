""
# URL configuration for config project.
#
# The `urlpatterns` list routes URLs to views. For more information please see:
# https://docs.djangoproject.com/en/6.0/topics/http/urls/
# Examples:
# Function views
# 1. Add an import:  from my_app import views
# 2. Add a URL to urlpatterns:  path('', views.home, name='home')
# Class-based views
# 1. Add an import:  from other_app.views import Home
# 2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
# Including another URLconf
# 1. Import the include() function: from django.urls import include, path
# 2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
# """

from django.contrib import admin
from django.urls import include, path

from inventory.views import inventory_detail, inventory_list

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/inventory/', inventory_list, name='inventory-list'),
    path('api/inventory/<int:pk>/', inventory_detail, name='inventory-detail'),
    path("api/weather/", include("weather.urls")),
    path("api/auth/", include("users.urls")),
    path("api/", include("plots.urls")),
    path("api/help-requests/", include("help_requests.urls")),
    path("api/notifications/", include("notifications.urls")),

]
