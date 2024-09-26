from django.db import models
from django.contrib.auth import get_user_model
from django.db.models import Q

User = get_user_model()

class ThreadManager(models.Manager):
  def by_user(self, **kwargs):
    user = kwargs.get('user')
    lookup = Q(first_user=user) | Q(second_user=user)
    qs = self.get_queryset().filter(lookup).distinct()
    return qs 

# model to define a direct message thread between two unique users
class Thread(models.Model):
  first_user = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True, related_name="thread_first_user")
  second_user = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True, related_name="thread_second_user")
  updated = models.DateTimeField(auto_now=True)
  timestamp = models.DateTimeField(auto_now_add=True)

  objects = ThreadManager()

  class Meta:
    unique_together = ['first_user', 'second_user']

# model to define each message sent 
class ChatMessage(models.Model):
  thread = models.ForeignKey(Thread, null=True, blank=True, on_delete=models.CASCADE, related_name="chatmessage_thread")
  sender = models.ForeignKey(User, on_delete=models.CASCADE)
  message = models.TextField()
  timestamp = models.DateTimeField(auto_now_add=True)

