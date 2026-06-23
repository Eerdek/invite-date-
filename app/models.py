from django.db import models


class Proposal(models.Model):
    """A sealed plan: who said yes, and the date/activity they chose.

    One row is written when the sweetheart submits the plan form on the yes page.
    """

    name = models.CharField(max_length=80, blank=True)
    date = models.DateField(null=True, blank=True)
    activity = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.name or 'Someone'} · {self.date or 'no date'}"
