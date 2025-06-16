from django.urls import path
from .views import *

urlpatterns = [
    path('recommendations/', get_recommendations, name='get_recommendations'),
    path('festival_vibe/', festival_vibe, name='festival_vibe'),
    path('organizer/create/', organizer_create, name='organizer_create'),
    path('festival/details/', festival_details, name='festival_details'),
]
