import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth.models import User

# the consumer will handle the websocket connection that is initiated with the client
class ChatConsumer(AsyncWebsocketConsumer):

  # mandatory function from AsyncWebsocketConsumer that will handle the websocket connection event
  async def connect(self):
    user = self.scope['user']
    chat_room = f'user_chatroom_{user.id}'
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