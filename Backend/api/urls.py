from django.urls import path
from .views import *
from .organizer import *

urlpatterns = [
    path('recommendations/', get_recommendations, name='get_recommendations'),  

    #organizer urls
    path('organizer/signup/', organizer_signup, name='organizer-signup'), 
    path('organizer/login/', organizer_login, name='organizer-login'),
]
