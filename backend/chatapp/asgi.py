"""
ASGI config for chatapp project.

It exposes the ASGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/3.1/howto/deployment/asgi/
"""

import os

from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack
from chat.consumers import JWTAuthMiddleware
import chat.routing
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'chatapp.settings')
os.environ["DJANGO_ALLOW_ASYNC_UNSAFE"] = "true"

# Synchronous Django application for handling HTTP requests
django_asgi_app = get_asgi_application()

# ASGI application definition with separate handlers for HTTP and WebSocket
application = ProtocolTypeRouter({
    "http": django_asgi_app,
    "websocket": JWTAuthMiddleware(
      AuthMiddlewareStack(
        URLRouter(
            chat.routing.websocket_url_patterns  # Handles WebSocket connections
        )
    ),
)})