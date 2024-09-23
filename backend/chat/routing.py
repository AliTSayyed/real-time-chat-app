from django.urls import path
from .consumers import *

# routing.py will handle websocket connection paths, a client will use this link to reach the consumer.
# every client will connect to the same one websocket, unique rooms will be created using the user'id. 
# messages must be broadcasted to both users, messages should only be broadcasted to the intended users as well.

websocket_url_patterns = [
  path('ws/chat/', ChatConsumer.as_asgi())
]