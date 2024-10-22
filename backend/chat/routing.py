from django.urls import path
from .consumers import ChatConsumer
from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack
from chat.consumers import JWTAuthMiddleware

# routing.py will handle websocket connection paths, a client will use this link to reach the consumer.
# every client will connect to the same one websocket, unique rooms will be created using the user'id. 
# messages must be broadcasted to both users, messages should only be broadcasted to the intended users as well.

websocket_url_patterns = [
  path('ws/chat/', ChatConsumer.as_asgi())
]

# ASGI application definition with separate handlers for HTTP and WebSocket
application = ProtocolTypeRouter({
    "http": get_asgi_application(),
    "websocket": JWTAuthMiddleware(
      AuthMiddlewareStack(
        URLRouter(
            websocket_url_patterns  # Handles WebSocket connections
        )
    ),
)})