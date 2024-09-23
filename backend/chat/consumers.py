from channels.generic.websocket import AsyncWebsocketConsumer

# the consumer will handle the websocket connection that is initiated with the client
class ChatConsumer(AsyncWebsocketConsumer):

  # mandatory function from AsyncWebsocketConsumer that will handle the websocket connection event
  async def connect(self):
    await self.accept()
    print('connected', self.scope)
    
  # mandatory function from AsyncWebsocketConsumer that will handle the websocket message recieve from client event
  async def receive(self):
    print('recieved')

  # mandatory function from AsyncWebsocketConsumer that will handle the websocket disconnect event
  async def disconnect(self):
    print('disconnected')
