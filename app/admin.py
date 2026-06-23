from django.contrib import admin

from .models import Proposal


@admin.register(Proposal)
class ProposalAdmin(admin.ModelAdmin):
    list_display = ("name", "date", "activity", "created_at")
    list_filter = ("date", "created_at")
    search_fields = ("name", "activity")
    readonly_fields = ("created_at",)
