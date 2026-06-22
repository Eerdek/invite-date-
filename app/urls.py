from django.urls import path
from .views import index, yes_page

urlpatterns = [
    path("", index, name="index"),
    path("yes/", yes_page, name="yes_page"),
]
