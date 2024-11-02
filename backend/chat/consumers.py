import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth.models import User, AnonymousUser
from channels.auth import get_user
from rest_framework_simplejwt.tokens import UntypedToken
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from urllib.parse import parse_qs
from chat.models import ChatMessage, Thread
from datetime import datetime, timezone
from django.db.models import Count

# the consumer will handle the websocket connection that is initiated with the client
class ChatConsumer(AsyncWebsocketConsumer):
 # Class variable to track online users
  online_users = set()

  # mandatory function from AsyncWebsocketConsumer that will handle the websocket connection event
  async def connect(self):
    user = self.scope['user']
    chat_room = f'user_chat_room_{user.id}'
    self.chat_room = chat_room

    await self.channel_layer.group_add(
      chat_room,
      self.channel_name
    )

    # Also join a general online users group
    await self.channel_layer.group_add(
        'online_users',
        self.channel_name
    )

    # Add user to online users set
    ChatConsumer.online_users.add(user.id)
     
    await self.accept()

    # Broadcast online status when connecting
    await self.channel_layer.group_send(
        'online_users',
        {
            'type': 'user_status',
            'content': {
                'type': 'user_status',
                'user_id': user.id,
                'status': 'online'
            }
        }
    )

    # Send the list of all currently online users to the new connection
    for online_user_id in ChatConsumer.online_users:
        if online_user_id != user.id:  # Don't send own status again
            await self.send(text_data=json.dumps({
                'type': 'user_status',
                'user_id': online_user_id,
                'status': 'online'
            }))

    # Send initial unread counts when user connects
    await self.send_unread_counts()
    print('connected')


  # mandatory function from AsyncWebsocketConsumer that will handle the websocket disconnect event
  async def disconnect(self, close_code):
    # Broadcast offline status when disconnecting
    user = self.scope['user']
    
    # Remove user from online users set
    ChatConsumer.online_users.discard(user.id)
    await self.channel_layer.group_send(
        'online_users',
        {
            'type': 'user_status',
            'content': {
                'type': 'user_status',
                'user_id': user.id,
                'status': 'offline'
            }
        }
    )

    await self.channel_layer.group_discard(
    self.chat_room,  # Leave the room
    self.channel_name
    )
    print('disconnected', close_code)

  # mandatory function from AsyncWebsocketConsumer that will handle the websocket message recieve from client event
  async def receive(self, text_data):
    print('received: ', text_data)
    data = json.loads(text_data) # reformat json from string to python dict
    message_type = data.get('type') # get the message type from the websocket connection
  
     # Handle read receipt
    if message_type == 'read_receipt':
        await self.handle_read_receipt(data)
    
    # Handle chat message
    elif message_type == 'chat_message':
        await self.handle_chat_message(data)
    
    # Handle typing start
    elif message_type == 'typing_start':
        await self.handle_typing_start(data)

    # Handle typing stop
    elif message_type == 'typing_stop':
        await self.handle_typing_stop(data)

  async def handle_read_receipt(self, data):
    message_id = data.get('message_id')
    recipient_id = data.get('recipient_id')
    recipient_chat_room = f'user_chat_room_{recipient_id}'
    try:
        # Use sync_to_async to get the message asynchronously
        message = await self.get_message(message_id)
        if message:
            message.is_read = True  # Mark the message as read
            await database_sync_to_async(message.save)()  # Save the changes

       # Get updated unread count for the thread
        thread = await self.get_thread_by_message(message_id)
      
        response = {
            'type': 'read_receipt',
            'message_id': message_id,
            'is_read': True,
            'thread_id': thread.id,
        }
        
        await self.channel_layer.group_send( 
            recipient_chat_room,  # Notify all sender's active sessions
            {
                'type': 'read_receipt',
                'content': response,
            })
        
        # Separately send updated unread counts
        await self.notify_unread_counts(recipient_id)

    except ChatMessage.DoesNotExist:
        pass
    
  async def handle_chat_message(self, data):
    sender_id = data.get('sender_id')
    recipient_id = data.get('recipient_id')

    # Fetch the sender and recipient users from the database
    sender = await self.get_user_object(sender_id)
    recipient = await self.get_user_object(recipient_id)

    if not sender:
        print('Error, sender id not found')
        return
    if not recipient:
        print('Error, recipient id not found')
        return

    # Create chat room names
    recipient_chat_room = f'user_chat_room_{recipient_id}'

    # Get the thread between the users
    thread = await self.get_thread(sender, recipient)

    # Save the message to the database
    msg = data['message']
    chat_message = await self.create_chat_message(thread, sender, msg, recipient)

    # Prepare the response
    message_date = datetime.now(tz=timezone.utc).isoformat()

    response = {
        'type': 'chat_message',
        'message': msg,
        'sender_id': sender_id,
        'recipient_id': recipient_id,
        'timestamp': message_date,
        'is_read': False,
        'message_id': chat_message.id,
        'thread_id': thread.id,
    }

    # Send message to recipient and sender
    await self.channel_layer.group_send(recipient_chat_room, {'type': 'chat_message', 'content': response})
    await self.channel_layer.group_send(self.chat_room, {'type': 'chat_message', 'content': response})

    # Also send updated total counts
    await self.notify_unread_counts(recipient_id)

  async def handle_typing_start(self, data):
    sender_id = data.get('sender_id')
    recipient_id = data.get('recipient_id')

    sender = await self.get_user_object(sender_id)
    recipient = await self.get_user_object(recipient_id)

    # Get the thread between the users
    thread = await self.get_thread(sender, recipient)

    response = {
        'type': 'typing_start',
        'sender_id': sender_id,
        'recipient_id': recipient_id,
        'thread_id': thread.id,
    }

    recipient_chat_room = f'user_chat_room_{recipient_id}'
    await self.channel_layer.group_send(recipient_chat_room, {'type': 'typing_start', 'content': response})

  async def handle_typing_stop(self, data):
    sender_id = data.get('sender_id')
    recipient_id = data.get('recipient_id')

    sender = await self.get_user_object(sender_id)
    recipient = await self.get_user_object(recipient_id)

    # Get the thread between the users
    thread = await self.get_thread(sender, recipient)

    response = {
        'type': 'typing_stop',
        'sender_id': sender_id,
        'recipient_id': recipient_id,
        'thread_id': thread.id,
    }

    recipient_chat_room = f'user_chat_room_{recipient_id}'
    await self.channel_layer.group_send(recipient_chat_room, {'type': 'typing_stop', 'content': response})


 # Handler for user status updates
  async def user_status(self, event):
      content = event['content']
      
      await self.send(text_data=json.dumps({
          'type': 'user_status',
          'user_id': content['user_id'],
          'status': content['status']
      }))
  
  # custom send chat message handler
  async def chat_message(self, event):
    content = event['content']

    await self.send(text_data=json.dumps({
      'type':'chat_message',
      'message': content['message'],
      'sender_id': content['sender_id'],
      'recipient_id':content['recipient_id'],
      'timestamp':content['timestamp'],
      'is_read':content['is_read'],
      'message_id':content['message_id'],
      'thread_id':content['thread_id'],
    }))

  # typing start handler
  async def typing_start(self, event):
    content = event['content']

    await self.send(text_data=json.dumps({
      'type':'typing_start',
      'sender_id': content['sender_id'],
      'recipient_id':content['recipient_id'],
      'thread_id':content['thread_id'],
    }))
  
  # typing stop handler 
  async def typing_stop(self, event):
    content = event['content']

    await self.send(text_data=json.dumps({
      'type':'typing_stop',
      'sender_id': content['sender_id'],
      'recipient_id':content['recipient_id'],
      'thread_id':content['thread_id'],
    }))
  
    # read receipt handler 
  async def read_receipt(self, event):
    content = event['content']

    await self.send(text_data=json.dumps({
      'type':'read_receipt',
      'message_id': content['message_id'],
      'is_read': content['is_read'],
      'thread_id':content['thread_id'],
    }))

  # Use this method when you need to send counts to a specific user (e.g., after marking messages as read)
  async def notify_unread_counts(self, user_id):
    """Notify user of updated unread counts"""
    counts = await self.get_unread_counts(user_id)
    await self.channel_layer.group_send(
        f'user_chat_room_{user_id}',
        {
            'type': 'unread_counts',
            'content': counts
        }
    )

  # Handler for unread messages in realtime
  async def unread_counts(self, event):
    content = event['content']
    await self.send(text_data=json.dumps({
        'type': 'unread_counts',
        'thread_counts': content['thread_counts'],
        'total_unread': content['total_unread']
    }))

  # used when a user first connects to the websocket, pulls from database
  async def send_unread_counts(self):
    """Send initial unread counts to new connection"""
    user_id = self.scope['user'].id
    counts = await self.get_unread_counts(user_id)
    
    await self.send(text_data=json.dumps({
        'type': 'unread_counts',
        'thread_counts': counts['thread_counts'],
        'total_unread': counts['total_unread']
    }))
  
  @database_sync_to_async
  def get_unread_counts(self, user_id):
    """Get unread message counts grouped by thread"""
    unread_messages = ChatMessage.objects.filter(
        recipient_id=user_id,
        is_read=False
    ).values('thread_id').annotate(
        count=Count('id')
    )
    
    # Convert to dict of thread_id: count
    thread_counts = {str(item['thread_id']): item['count'] for item in unread_messages}
    total_unread = sum(thread_counts.values())
    
    return {
        'type': 'unread_counts',
        'thread_counts': thread_counts,
        'total_unread': total_unread
    }
  
  @database_sync_to_async
  def get_thread_by_message(self, message_id):
      """Get thread by message ID"""
      return ChatMessage.objects.get(id=message_id).thread

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
  def create_chat_message(self, thread, sender, message, recipient):
    return ChatMessage.objects.create(
        thread=thread,
        sender=sender,
        message=message,
        recipient=recipient,
    )
  
  # Define the synchronous method for fetching the message
  @database_sync_to_async
  def get_message(self, message_id):
    return ChatMessage.objects.get(id=message_id)

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


class JWTAuthMiddleware:
    """
    Middleware for JWT authentication in WebSockets.
    """

    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        # Extract the token from the query string
        query_string = parse_qs(scope["query_string"].decode())
        token = query_string.get('token')

        if token:
            # If the token exists, authenticate the user
            scope['user'] = await get_user_from_jwt(token[0])
        else:
            # No token means an anonymous user
            scope['user'] = AnonymousUser()

        # Pass the modified scope to the next application in the stack
        return await self.app(scope, receive, send)