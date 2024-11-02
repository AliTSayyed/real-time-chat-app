import { Injectable } from '@angular/core';
import { filter, Observable, Subject } from 'rxjs';
import {
  ChatMessage,
  LoadedMessages,
  ReadReceipt,
  TypingStart,
  TypingStop,
  UnreadCountsMessage,
  UserStatus,
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
  private unreadCountsSubject = new Subject<UnreadCountsMessage>(); // subject to monitor how many messages are unread 
  private userStatusSubject = new Subject<UserStatus>(); // subject to keep track of who is online or offline

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
            switch (data.type) {
              case 'chat_message':
                console.log('Message sent from backend:', data);
                this.messageSubject.next(data);
                break;
              case 'typing_start':
              case 'typing_stop':
                console.log('Message sent from backend:', data);
                this.userTypingSubject.next(data);
                break;
              case 'read_receipt':
                console.log('Message sent from backend:', data);
                this.readReceiptSubject.next(data);
                break;
              case 'unread_counts':
                console.log('Unread counts from backend:', data);
                this.unreadCountsSubject.next(data);
                break;
              case 'user_status':
                console.log('User status: ', data)
                this.userStatusSubject.next(data);
                break;
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
          thread_id: chatMessage.thread_id,
          is_recipient_active: chatMessage.is_recipient_active
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
  getMessages(threadId: number | null): Observable<ChatMessage> {
    return this.messageSubject.asObservable().pipe(
      filter(message => {
        if (threadId === null) {
          // If no threadId is provided, don't filter messages
          return true;
        }
        // Otherwise, filter for specific thread
        return message.thread_id === threadId;
      })
    );
  }

  // captures if someone is typing 
  getTypingStatus() {
    return this.userTypingSubject.asObservable();
  }

  getReadRecipts(): Observable<ReadReceipt> {
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

  // getter for unread counts observable
  getUnreadCounts() {
    return this.unreadCountsSubject.asObservable();
  }

  // getter for user status
  getUserStatus(){
    return this.userStatusSubject.asObservable();
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