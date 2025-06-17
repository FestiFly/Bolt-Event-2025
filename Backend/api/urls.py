from django.urls import path
from .views import *
from .organizer import *

urlpatterns = [
    path('recommendations/', get_recommendations, name='get_recommendations'),
    path("festival-detail/", get_festival_by_id, name="get_festival_by_id"),
    path('ai-travel-suggestions/', ai_travel_suggestions, name='ai_travel_suggestions'),   
    path('get-all-festivals/', get_all_festivals, name='get_all_festivals'), 

    #organizer urls
    path('organizer/signup/', organizer_signup, name='organizer-signup'), 
    path('organizer/login/', organizer_login, name='organizer-login'),
]
