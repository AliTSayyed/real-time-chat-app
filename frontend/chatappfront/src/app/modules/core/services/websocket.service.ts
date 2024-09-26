import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { ChatMessage } from '../../../../types';
import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class WebsocketService {

  private socket!: WebSocket;
  private token: string | null = null;
  private messageSubject = new Subject<ChatMessage>(); // subject used to broadcast messages to chat components, allows multiple observers to receive the same values. Its a list that stores observables of type string. 

  constructor(private http: HttpClient) {}

  // Connect to the server's websocket 
  connect() {
    this.token = localStorage.getItem('access_token');  // Retrieve the JWT token from localStorage
    this.socket = new WebSocket(`ws://localhost:8000/ws/chat/?token=${this.token}`);
    console.log('frontend to backend websocket established')
    
    // check message that was sent to backend and then sent backto frontend
    this.socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      console.log('Message sent from backend:', data)
      this.messageSubject.next(data); // emmit message
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
  send(message: string, userID: number | null, recipientID: number | null) {
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

  // this is how to access the current messages from the websocket connection 
  getMessages(){
    return this.messageSubject.asObservable(); 
  }

  // Fetch previous messages for the thread (all messages, regardless of sender)
  getPreviousMessages(recipientID: number): Observable<ChatMessage[]> {
    return this.http.get<ChatMessage[]>(`http://localhost:8000/api/threads/messages/${recipientID}`);
  }


  // close the connection if its open
  disconnect() {
    if (this.socket) {
      this.socket.close();
    }
  }
}
