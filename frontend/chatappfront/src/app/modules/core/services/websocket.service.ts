import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class WebsocketService {

  private socket!: WebSocket;
  constructor() {}

  // Connect to the server's websocket 
  connect() {
    this.socket = new WebSocket(`ws:localhost:8000/ws/chat/`);

    console.log('frontend to backend websocket established')
    
    // check message that was sent
    this.socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      console.log('Message sent', data.message)
    };

    // log error
    this.socket.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    // log close
    this.socket.onclose = () => {
      console.log('Websocket connection closed')
    };
  }

  // Modified send method with readyState check
  send(message: string) {
  // Check if the WebSocket connection is open
  if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({
      'message': message
    }));
  } else {
    console.error('WebSocket connection is not open. Ready state:', this.socket.readyState);
  }
}

  // close the connection if its open
  disconnect() {
    if (this.socket) {
      this.socket.close();
    }
  }
}
