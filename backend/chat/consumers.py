import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth.models import User, AnonymousUser
from channels.middleware import BaseMiddleware
from channels.auth import get_user
from rest_framework_simplejwt.tokens import UntypedToken
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from urllib.parse import parse_qs
from chat.models import ChatMessage, Thread
from datetime import datetime, timezone

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
    message_type = data.get('type') # get the message type from the websocket connection

    sender_id = data['sender_id']
    recipient_id = data['recipient_id']

    # Fetch the sender and recipient users from the database
    sender = await self.get_user_object(sender_id)
    recipient = await self.get_user_object(recipient_id)

    if not sender:
      print('Error, sender id not found')
    if not recipient:
      print('Error, recipeint id not found')

    # create the correct chat rooms for the 2 unique users. 
    recipient_chat_room = f'user_chat_room_{recipient_id}' # broadcast the same message to the recipient
  
    # Stop the operation if the sender is not authenticated
    self_user = self.scope['user']
    if self_user.id != sender_id:
      print(f"Error: Sender mismatch, should be {self_user.id}, but was {sender_id}")
      return False 
    
    # condition for sending a chat message
    if message_type == 'chat_message':
      msg = data['message']
      if not msg:
        print('Error, empty message')
        return False
      
      # Get or create the thread between the users
      thread = await self.get_thread(sender, recipient)

      # Save the message to the database
      await self.create_chat_message(thread, sender, msg)

      # get the current date the message was sent, time in UTC
      message_date = datetime.now(tz=timezone.utc)
      # Format the date as ISO 8601
      formatted_date = message_date.isoformat()

      # response back to client
      response = {
        'type':'chat_message',
        'message': msg,
        'sender_id': sender_id,
        'recipient_id': recipient_id,
        'timestamp': formatted_date,
      }

      await self.channel_layer.group_send( # will update all the browsers of the recipient
        recipient_chat_room,
        {
          'type':'chat_message',
          'content': response
        }) 

      await self.channel_layer.group_send( # will update all the browsers of the sender
        self.chat_room,
      {
        'type':'chat_message',
        'content': response
      }) 
    
    # Broadcastng recipient has started typing  
    elif message_type == 'typing_start':
      print('user is typing')
      response = {
        'type':'typing_start',
        'sender_id': sender_id,
        'recipient_id': recipient_id,
      }

      await self.channel_layer.group_send( # will update all the browsers of the recipient to show sender 'is typing...'
      recipient_chat_room,
      {
        'type':'typing_start',
        'content': response
      }) 
  
    # Broadcastng recipient has stopped typing 
    elif message_type == 'typing_stop':
      print('user stopped typing')
      response = {
        'type':'typing_stop',
        'sender_id': sender_id,
        'recipient_id': recipient_id,
      }

      await self.channel_layer.group_send( # will update all the browsers of the recipient to stop showing 'is typing...'
      recipient_chat_room,
      {
        'type':'typing_stop',
        'content': response
      }) 

  # mandatory function from AsyncWebsocketConsumer that will handle the websocket disconnect event
  async def disconnect(self, close_code):
    print('disconnected', close_code)
    await self.channel_layer.group_discard(
    self.chat_room,  # Leave the room
    self.channel_name
    )
  
  # custom send chat message handler
  async def chat_message(self, event):
    content = event['content']

    await self.send(text_data=json.dumps({
       'type':'chat_message',
      'message': content['message'],
      'sender_id': content['sender_id'],
      'recipient_id':content['recipient_id'],
      'timestamp':content['timestamp'],
    }))

  # typing start handler
  async def typing_start(self, event):
    content = event['content']

    await self.send(text_data=json.dumps({
      'type':'typing_start',
      'sender_id': content['sender_id'],
      'recipient_id':content['recipient_id'],
    }))
  
  # typing stop handler 
  async def typing_stop(self, event):
    content = event['content']

    await self.send(text_data=json.dumps({
      'type':'typing_stop',
      'sender_id': content['sender_id'],
      'recipient_id':content['recipient_id'],
    }))

  @database_sync_to_async
  def get_user_object(self, user_id):
    try:
        return User.objects.get(id=user_id)
    except User.DoesNotExist:
        return None
    
  # Get a thread between two users
  @database_sync_to_async
  def get_thread(self, sender, recipient):
      thread = Thread.objects.get(
          first_user=min(sender, recipient, key=lambda user: user.id),
          second_user=max(sender, recipient, key=lambda user: user.id)
      )
      return thread

  # Save the chat message to the database
  @database_sync_to_async
  def create_chat_message(self, thread, sender, message):
      return ChatMessage.objects.create(
          thread=thread,
          sender=sender,
          message=message
      )

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