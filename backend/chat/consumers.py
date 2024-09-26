import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth.models import User, AnonymousUser
from channels.middleware import BaseMiddleware
from channels.auth import get_user
from rest_framework_simplejwt.tokens import UntypedToken
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from urllib.parse import parse_qs

# the consumer will handle the websocket connection that is initiated with the client
class ChatConsumer(AsyncWebsocketConsumer):

  # mandatory function from AsyncWebsocketConsumer that will handle the websocket connection event
  async def connect(self):
    user = self.scope['user']
    chat_room = f'user_chat_room_{user.id}'
    self.chat_room = chat_room
    await self.channel_layer.group_add(
      chat_room,
      self.channel_name
    )
      
    await self.accept()
    print('connected')
    
  # mandatory function from AsyncWebsocketConsumer that will handle the websocket message recieve from client event
  async def receive(self, text_data):
    print('received')
    data = json.loads(text_data) # reformat json from string to python dict
  
    msg = data['message']
    sender_id = data['sender_id']
    recipient_id = data['recipient_id']

    if not msg:
      print('Error, empty message')
      return False
    
    # response back to client after it sent a message
    sent_by_user = await self.get_user_object(sender_id)
    send_to_user = await self.get_user_object(recipient_id)

    if not sent_by_user:
      print('Error, sender id not found')
    if not send_to_user:
      print('Error, recipeint id not found')

    recipient_chat_room = f'user_chat_room_{recipient_id}' # broadcast the same message to the recipient
    self_user = self.scope['user']
    if self_user.id != sender_id:
      print(f"Error: Sender mismatch, should be {self_user.id}, but was {sender_id}")
      return False  # Stop the operation if the sender is not authenticated

    response = {
      'message': msg,
      'sender_id': self_user.id,
      'recipient_id': recipient_id
    }

    await self.channel_layer.group_send( # will update all the browsers of the recipient
      recipient_chat_room,
      {
        'type':'chat_message',
        'content': response
      }
    ) 

    await self.channel_layer.group_send( # will update all the browsers of the sender
      self.chat_room,
    {
      'type':'chat_message',
      'content': response
    }
  ) 

  # mandatory function from AsyncWebsocketConsumer that will handle the websocket disconnect event
  async def disconnect(self, close_code):
    print('disconnected', close_code)
    await self.channel_layer.group_discard(
    self.chat_room,  # Leave the room
    self.channel_name
    )
  
  # custom send handler
  async def chat_message(self, event):
    print('chat_message', event)
    content = event['content']

    await self.send(text_data=json.dumps({
      'message': content['message'],
      'sender_id': content['sender_id'],
      'recipient_id':content['recipient_id']
    }))

  @database_sync_to_async
  def get_user_object(self, user_id):
    try:
        return User.objects.get(id=user_id)
    except User.DoesNotExist:
        return None

# Need to explicitly handle tokens with channels, so a user can be authenticated 
@database_sync_to_async
def get_user_from_jwt(token):
    try:
        # Decode the token and extract the payload (user info)
        decoded_token = UntypedToken(token)  # Validate the token
        user_id = decoded_token['user_id']  # Extract user ID from the token payload
        
        # Fetch the user from the database using the user_id from the token
        return User.objects.get(id=user_id)
    except (InvalidToken, TokenError, User.DoesNotExist):
        return AnonymousUser()

class JWTAuthMiddleware(BaseMiddleware):
    async def __call__(self, scope, receive, send):
        # Extract the token from the WebSocket connection (e.g., from query string)
        token = parse_qs(scope['query_string'].decode()).get('token')

        if token:
            scope['user'] = await get_user_from_jwt(token[0])
        else:
            scope['user'] = AnonymousUser()

        return await super().__call__(scope, receive, send)