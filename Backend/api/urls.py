from django.urls import path
from .views import *
from .organizer import *

urlpatterns = [
    path('recommendations/', get_recommendations, name='get_recommendations'),
    path("festival-detail/", get_festival_by_id, name="get_festival_by_id"),
    path('smart-planner/', smart_planner, name='ai_travel_suggestions'),   
    path('get-all-festivals/', get_all_festivals, name='get_all_festivals'), 
    path("fetch-reddit-reviews/", fetch_reddit_reviews_by_id, name="fetch_reddit_reviews"),
    path("enhance-festival-ai/", enhance_festival_ai, name="enhance_festival_ai"),
    path("generate-voice-briefing/", generate_voice_briefing, name="generate_voice_briefing"),
    path("generate-ai-video/", generate_ai_video, name="generate_ai_video"),

    #organizer urls
    path('organizer/signup/', organizer_signup, name='organizer-signup'), 
    path('organizer/login/', organizer_login, name='organizer-login'),
]
