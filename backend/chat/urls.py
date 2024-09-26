from django.urls import path
from .views import *

urlpatterns = [
  path('check-auth/', check_authentication, name='check_auth'),
  path('register/', register, name='register'),
  path('login/', login, name='login'),
  path('threads/', threads, name="threads"),
  path('threads/messages/<int:recipient_id>', thread_messages, name="thread_messages")
]