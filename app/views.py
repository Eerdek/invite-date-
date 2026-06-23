import logging

from django.shortcuts import render, redirect
from django.urls import reverse
from django.utils.dateparse import parse_date
from urllib.parse import urlencode

from .models import Proposal

logger = logging.getLogger(__name__)


def index(request):
    # The "No" button is decorative (it dodges and can't be submitted), so any
    # POST reaching here is a "Yes". Carry the name over to the yes page.
    if request.method == "POST":
        name = request.POST.get("name", "").strip()
        query = urlencode({"name": name})
        return redirect(f"{reverse('yes_page')}?{query}")
    return render(request, "index.html")


def yes_page(request):
    # Name comes from the planning form (POST) or the redirect query (GET).
    name = (request.POST.get("name") or request.GET.get("name") or "").strip()

    context = {"name": name}

    if request.method == "POST":
        # The sweetheart picked a date and an activity — show the confirmation.
        date = request.POST.get("date", "").strip()
        activity = request.POST.get("activity", "").strip()
        context["date"] = date
        context["activity"] = activity
        context["planned"] = True

        # Persist the sealed plan. A DB hiccup must never break the romantic
        # moment, so failures are logged but swallowed — the confirmation still
        # renders either way.
        try:
            Proposal.objects.create(
                name=name,
                date=parse_date(date),
                activity=activity,
            )
        except Exception:
            logger.exception("Failed to save proposal")

    return render(request, "yes_page.html", context)
