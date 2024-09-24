import json
from channels.generic.websocket import AsyncWebsocketConsumer

# the consumer will handle the websocket connection that is initiated with the client
class ChatConsumer(AsyncWebsocketConsumer):

  # mandatory function from AsyncWebsocketConsumer that will handle the websocket connection event
  async def connect(self):
    await self.accept()
    print('connected')
    
  # mandatory function from AsyncWebsocketConsumer that will handle the websocket message recieve from client event
  async def receive(self, text_data):
    print('received')
    data = json.loads(text_data) # reformat json from string to python dict
  
    msg = data['message']
    if not msg:
      return False
    
    response = {
      'message': msg
    }

    # send the response in a json format
    await self.send(text_data=json.dumps(response))



  # mandatory function from AsyncWebsocketConsumer that will handle the websocket disconnect event
  async def disconnect(self, close_code):
    print('disconnected', close_code)
