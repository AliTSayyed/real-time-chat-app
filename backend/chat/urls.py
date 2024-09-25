from django.urls import path
from .views import *

urlpatterns = [
  path('check-auth/', check_authentication, name='check_auth'),
  path('register/', register, name='register'),
  path('login/', login, name='login'),
]