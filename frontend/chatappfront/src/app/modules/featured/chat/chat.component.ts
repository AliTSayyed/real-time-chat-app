import {
  AfterViewChecked,
  Component,
  ElementRef,
  Input,
  ViewChild,
} from '@angular/core';
import { WebsocketService } from '../../core/services/websocket.service';
import { Subscription } from 'rxjs';
import { ChatMessage, LoadedMessages } from '../../../../types';
import { ChatService } from '../../core/services/chat.service';

@Component({
  selector: 'app-chat',
  templateUrl: './chat.component.html',
  styleUrl: './chat.component.scss',
})
export class ChatComponent implements AfterViewChecked {
  @Input() userID: number | null = null;
  recipientID: number | null = null;
  recipientName: string = '';
  userMessage: string = ''; // this is what the user types.
  messages: ChatMessage[] = []; // list of messages to display in the thread

  // default to setting all chats to off on page load.
  activeChat: boolean = false;

  private messageSubscription!: Subscription; // creates a subscription to all current messages being sent.
  private dbMessagesSubscription!: Subscription; // creates a subscription to all messages from the database.

  @ViewChild('messagesContainer') private messagesContainer!: ElementRef; // view child to access DOM of the chats to automatically scroll down

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

  // Automatically scroll to the bottom of the chat on chat load and on new message send
  scrollToBottom(): void {
    if (this.messagesContainer && this.messagesContainer.nativeElement) {
      try {
        this.messagesContainer.nativeElement.scrollTop =
          this.messagesContainer.nativeElement.scrollHeight; // automatically scroll to the bottom of the contianers height
      } catch (err) {
        console.error('Scroll error: ', err);
      }
    }
  }

  // After each change of the view (new message sent), scroll down. Scrolling down wont automatically happend without this function.
  ngAfterViewChecked(): void {
    this.scrollToBottom();
  }

  // push all realtime messages sent by the users (stored in mememory and then the database, but on page refresh will these messages then only be loaded by the database.)
  ngOnInit() {
    this.messageSubscription = this.websocketService
      .getMessages()
      .subscribe((msg: ChatMessage) => {
        this.messages.push(msg);
        this.scrollToBottom(); // scroll down when new message is sent or received
      });

    // when a chat is loaded, need to obtain the recipient id, recipient name, and previous messages from the database.
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
          // after getting all the messages as an observable then subscribe to it
          this.messages = response.messages; // Extract the 'messages' array from the response
          console.log(response.messages); // log the entire chat with other user from database.
          this.scrollToBottom(); // scroll to bottom after loading all the messages.
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
