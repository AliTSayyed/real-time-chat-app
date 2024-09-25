import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class WebsocketService {

  private socket!: WebSocket;
  private messageSubject = new Subject<string>(); // subject used to broadcast messages to chat components, allows multiple observers to receive the same values. Its a list that stores observables of type string. 

  constructor() {}

  // Connect to the server's websocket 
  connect() {
    this.socket = new WebSocket(`ws:localhost:8000/ws/chat/`);

    console.log('frontend to backend websocket established')
    
    // check message that was sent to backend and then sent backto frontend
    this.socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      console.log('Message sent from backend:', data.message)
      this.messageSubject.next(data.message); // emmit message
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
  send(message: string, userID: string, recipientID: string) {
  // Check if the WebSocket connection is open
  if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({
      'message': message,
      'sender_id': userID,
      'recipient_id': recipientID,
    }));
  } else {
    console.error('WebSocket connection is not open. Ready state:', this.socket.readyState);
  }
}

getMessages(){
  return this.messageSubject.asObservable(); // this is how to acess the messages from the websocket connection 
}

  // close the connection if its open
  disconnect() {
    if (this.socket) {
      this.socket.close();
    }
  }
}
