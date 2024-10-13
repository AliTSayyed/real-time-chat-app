import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import {
  ChatMessage,
  LoadedMessages,
  ReadReceipt,
  TypingStart,
  TypingStop,
} from '../../../../types';
import { HttpClient } from '@angular/common/http';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root',
})
export class WebsocketService {
  // create websocket connection
  private socket!: WebSocket;

  // store unique token for a logged in user
  private token: string | null = null;

  // subject used to broadcast messages to chat components, allows multiple observers to receive the same values. Its a list that stores observables of type ChatMessage.
  // a subject can be an observer and a observable, can emmit values to subscribers and recieve (.next()) values as well.
  private messageSubject = new Subject<ChatMessage>();
  private userTypingSubject = new Subject<TypingStart | TypingStop>(); // subject to monitor if there is a typing start or stop message sent.
  private readReceiptSubject = new Subject<ReadReceipt>(); // subject to monitor if a message has been read

  constructor(private http: HttpClient, private authService: AuthService) {}

  // Connect to the server's websocket only if a user is authenticated
  connect() {
    this.authService.checkAuthentication().subscribe({
      next: (isAuthenticated) => {
        if (isAuthenticated) {
          // Retrieve the JWT token from localStorage
          this.token = localStorage.getItem('access_token');
          // confirm connection using token
          this.socket = new WebSocket(
            `ws://localhost:8000/ws/chat/?token=${this.token}`
          );
          console.log('frontend to backend websocket established');

          // check message that was sent to backend and then sent back to frontend, works on one message at a time but is async.
          this.socket.onmessage = (event) => {
            const data = JSON.parse(event.data);
            if (data.type === 'chat_message') {
              console.log('Message sent from backend:', data);
              this.messageSubject.next(data); // emmit message to the message subject if it is of type chat message
            } else if (
              data.type === 'typing_start' ||
              data.type === 'typing_stop'
            ) {
              console.log('Message sent from backend:', data);
              this.userTypingSubject.next(data); // emmit message to Typing subject if it is of type starting or stopping typing.
            } else if (data.type === 'read_receipt') {
              console.log('Message sent from backend:', data);
              this.readReceiptSubject.next(data); //  Any message in this subject has to have is_read = True in the DB.
            }
          };

          // log error
          this.socket.onerror = (error) => {
            console.error('WebSocket error:', error);
          };

          // log close
          this.socket.onclose = () => {
            console.log('Websocket connection closed');
          };
        }
      },
      error: (error) => {
        console.error('Error checking authentication status:', error);
      },
    });
  }

  // Send method with readyState check
  send(chatMessage: ChatMessage) {
    // Check if the WebSocket connection is open
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(
        JSON.stringify({
          type: 'chat_message',
          message: chatMessage.message,
          sender_id: chatMessage.sender_id,
          recipient_id: chatMessage.recipient_id,
        })
      );
    } else {
      console.error(
        'WebSocket connection is not open. Ready state:',
        this.socket.readyState
      );
    }
  }

  // Send a read receipt to the backend if a message has been read by a recipient
  sendReadReceipt(message_id: number | null, recipient_id: number | null) {
    // Check if the WebSocket connection is open
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(
        JSON.stringify({
          type: 'read_receipt',
          message_id: message_id,
          recipient_id: recipient_id,
        })
      );
    } else {
      console.error(
        'WebSocket connection is not open. Ready state:',
        this.socket.readyState
      );
    }
  }

  // this is how to access the current messages from the current websocket connection, until page is refreshed.
  getMessages() {
    return this.messageSubject.asObservable(); // need to convert subject to observable.
  }

  getTypingStatus() {
    return this.userTypingSubject.asObservable();
  }

  getReadRecipts() {
    return this.readReceiptSubject.asObservable();
  }

  // Fetch previous messages for the thread (all messages, regardless of sender) (old)
  getDatabaseMessages(recipientID: number): Observable<LoadedMessages> {
    return this.http.get<LoadedMessages>(
      `http://localhost:8000/api/threads/messages/${recipientID}`
    );
  }

  // Fetch previous messages in a paginated manner, this way we are not loading all the messages of each chat at once.
  getPaginatedMessages(recipientID: number, limit: number, offset: number) {
    return this.http.get<LoadedMessages>(
      `http://localhost:8000/api/threads/messages/${recipientID}/?limit=${limit}&offset=${offset}`
    );
  }

  // Send typing start notification
  isTyping(senderID: number | null, recipientID: number | null): void {
    this.socket.send(
      JSON.stringify({
        type: 'typing_start',
        sender_id: senderID,
        recipient_id: recipientID,
      })
    );
  }

  // Send typing start notification
  stoppedTyping(senderID: number | null, recipientID: number | null): void {
    this.socket.send(
      JSON.stringify({
        type: 'typing_stop',
        sender_id: senderID,
        recipient_id: recipientID,
      })
    );
  }

  // close the connection if its open
  disconnect() {
    if (this.socket) {
      this.socket.close();
    }
  }
}
