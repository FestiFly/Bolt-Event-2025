from django.urls import path
from .views import *

urlpatterns = [
    path('recommendations/', get_recommendations),
    path('festival_vibe/', festival_vibe),
    path('organizer/create/', organizer_create),
    path('festival/details/', festival_details),

    
]
