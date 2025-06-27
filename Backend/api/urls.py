from django.urls import path
from .views import *
from .organizer import *
from .users import *

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
    path('organizer/festival/create/', create_festival, name='create-festival'),
    path('organizer/festivals/', list_organizer_festivals, name='list-festivals'),
    path('organizer/festival/<str:fest_id>/update/', update_festival, name='update-festival'),
    path('organizer/festival/<str:fest_id>/delete/', delete_festival, name='delete-festival'),
    path('payment-success/', payment_success, name='payment-success'),
    path('subscription/status/', check_subscription_status, name='check_subscription_status'),


    #user urls
    path('user/signup/', user_signup, name='user-signup'),
    path('user/login/', user_login, name='user-login'),
    path('user/verify/', verify_token, name='user-verify'),
    path('user/profile/', user_profile, name='user-profile'),
    path('user/update-profile/', update_profile, name='update-profile'),
    path('user/apply-referral/', apply_referral, name='apply-referral'),


    #test urls
    path('heygen-generate/', generate_heygen_video, name='generate_heygen_video'),

]
