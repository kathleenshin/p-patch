from django.contrib import admin

from .models import Garden, Plot, PlotNote, PlotOwnership, PlotPhoto


@admin.register(Garden)
class GardenAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "city", "state", "created_at")
    search_fields = ("name", "city")


@admin.register(Plot)
class PlotAdmin(admin.ModelAdmin):
    list_display = ("id", "garden", "plot_number", "is_active")
    list_filter = ("is_active", "garden")
    search_fields = ("plot_number", "garden__name")


@admin.register(PlotOwnership)
class PlotOwnershipAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "plot",
        "user",
        "is_primary",
        "start_date",
        "end_date",
    )
    list_filter = ("is_primary",)


@admin.register(PlotNote)
class PlotNoteAdmin(admin.ModelAdmin):
    list_display = ("id", "plot", "author", "visibility", "created_at")
    list_filter = ("visibility",)


@admin.register(PlotPhoto)
class PlotPhotoAdmin(admin.ModelAdmin):
    list_display = ("id", "plot", "uploaded_by", "caption", "created_at")
    list_filter = ("plot__garden",)
    search_fields = ("caption", "plot__plot_number")
