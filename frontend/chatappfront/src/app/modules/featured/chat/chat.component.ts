import { Component, Input, SimpleChanges } from '@angular/core';
import { WebsocketService } from '../../core/services/websocket.service';
import { Subscription } from 'rxjs';
import { ChatMessage, LoadedMessages } from '../../../../types';
import { ChatService } from '../../core/services/chat.service';

@Component({
  selector: 'app-chat',
  templateUrl: './chat.component.html',
  styleUrl: './chat.component.scss',
})
export class ChatComponent {
  @Input() userID: number | null = null;
  recipientID: number | null = null;
  recipientName: string = '';
  userMessage: string = ''; // this is what the user types.
  messages: ChatMessage[] = []; // list of messages to display in the thread

  // default to setting all chats to off on page load. 
  activeChat: boolean = false;

  private messageSubscription!: Subscription; // creates a subscription to all current messages being sent.
  private dbMessagesSubscription!: Subscription; // creates a subscription to all messages from the database.

  // chat message object that will store the message and details sent by the user.
  chatMessage: ChatMessage = {
    message: '',
    sender_id: null,
    recipient_id: null,
    timestamp: '',
  };

  constructor(
    private websocketService: WebsocketService,
    private chatService: ChatService
  ) {}

  // push all realtime messages sent by the users (stored in mememory and then the database, but on page refresh will these messages then only be loaded by the database.)
  ngOnInit() {
    this.messageSubscription = this.websocketService
      .getMessages()
      .subscribe((msg: ChatMessage) => {
        this.messages.push(msg);
      });

    // when a chat is loaded, need to obtain the recipient id, name, and previous messages from the database. 
    this.chatService.getSelectedChatData().subscribe((selectedChat) => {
      if (selectedChat) {
        this.userID = selectedChat.sendDataToChat.sender_id;
        this.recipientID = selectedChat.sendDataToChat.recipient_id;
        this.recipientName = selectedChat.sendDataToChat.recipient_username;
        this.activeChat = true;
        console.log(
          'Chat between user',
          this.userID,
          'and',
          this.recipientID,
          'established'
        );
        this.loadPreviousMessages();
      }
    });
  }

  loadPreviousMessages() {
    // Fetch previous messages for the current thread between the logged in user and the recipient user.
    if (this.recipientID) {
      this.dbMessagesSubscription = this.websocketService
        .getDatabaseMessages(this.recipientID)
        .subscribe((response: LoadedMessages) => {
          this.messages = response.messages; // Extract the 'messages' array from the response
          console.log(response.messages); // log the entire chat with other user from database.
        });
    }
  }

  // when a user sends a message, need to send the message content, the user id who sent the message, and the id of the recipient
  sendMessage() {
    if (this.userMessage !== '') {
      // this is the data to send to the backend
      this.chatMessage = {
        message: this.userMessage,
        sender_id: this.userID,
        recipient_id: this.recipientID,
        timestamp: '',
      };

      this.websocketService.send(this.chatMessage);
    }
    this.userMessage = '';
  }
}
