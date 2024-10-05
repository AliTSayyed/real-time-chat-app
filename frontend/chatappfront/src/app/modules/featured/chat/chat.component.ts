import {
  AfterViewChecked,
  AfterViewInit,
  Component,
  ElementRef,
  Input,
  ViewChild,
} from '@angular/core';
import { WebsocketService } from '../../core/services/websocket.service';
import { Subscription } from 'rxjs';
import { ChatMessage, LoadedMessages } from '../../../../types';
import { ChatService } from '../../core/services/chat.service';
import { LastmessageService } from '../../core/services/lastmessage.service';

@Component({
  selector: 'app-chat',
  templateUrl: './chat.component.html',
  styleUrl: './chat.component.scss',
})
export class ChatComponent implements AfterViewChecked  {
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
  // Track if the user is already at the bottom
  scrollAtBottom: boolean = true; 
  // var to keep track if user is trying to load more messages
  isLoadingMessages: boolean = false;
  // start at the latest message for splicing the response messages
  offset: number = 0;
  // load 20 more messages on scroll up
  limit: number = 20;

  // chat message object that will store the message and details sent by the user.
  chatMessage: ChatMessage = {
    message: '',
    sender_id: null,
    recipient_id: null,
    timestamp: '',
  };

  constructor(
    private websocketService: WebsocketService,
    private chatService: ChatService,
    private lastMessageService: LastmessageService
  ) {}

  // Function to determine if the user is at the bottom of the chat
  isUserAtBottom(): boolean {
    const threshold = 50; // Allow some leeway for the user to be considered at the bottom
    const position = this.messagesContainer.nativeElement.scrollTop + this.messagesContainer.nativeElement.offsetHeight;
    const height = this.messagesContainer.nativeElement.scrollHeight;
    return position > height - threshold;
  }

  // function listening to when users are scrolling all the way up to load previous messages. 
  onScrollMaxUp() {
    const scrollPosition = this.messagesContainer.nativeElement.scrollTop;
    if (scrollPosition === 0 && !this.isLoadingMessages) {  // User has scrolled to the top
      this.loadPreviousMessages();
    }

    // Track if the user is at the bottom
    this.scrollAtBottom = this.isUserAtBottom();
  }

  // Automatically scroll to the bottom of the chat on chat load and on new message send
  scrollToBottom(): void {
    // use this if statement to run after the DOM element has loaded. 
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
    // do not scroll to bottom if the user is trying to scroll up, without this check scrollToBottom() will always be called when the user is trying to scroll up. 
    if (this.scrollAtBottom) {
      this.scrollToBottom();
    }
  }

  // push all realtime messages sent by the users (stored in mememory and then the database, but on page refresh will these messages then only be loaded by the database.)
  ngOnInit() {
    this.messageSubscription = this.websocketService
      .getMessages()
      .subscribe((msg: ChatMessage) => {
        this.messages.push(msg);
        this.lastMessageService.updateLatestMessage(msg); // send real time message to the contacts component to update latest message preivew.
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
        this.loadInitalMessages();
      }
    });
  }

  loadInitalMessages() {
    // Fetch previous messages (but not all messages at once) for the current thread between the logged in user and the recipient user.
    if (this.recipientID) {
      const limit = 30; // start from the last 30 message sent on chat load. 
      this.offset = 0; // always start offset at 0 when chat loads. 
      this.dbMessagesSubscription = this.websocketService
        .getPaginatedMessages(this.recipientID, limit, this.offset)
        .subscribe((response: LoadedMessages) => {
          // after getting all the messages as an observable then subscribe to it
          this.messages = response.messages.reverse(); // Extract the 'messages' array from the response and reverse their order. 
          console.log(response); // log the entire chat with other user from database.
          this.scrollToBottom(); // scroll to bottom after loading all the messages.
        });
    }
  }

  // function to load previous messages in the thread, so thread does not need to load all messages on chat load. 
  loadPreviousMessages() {
    this.isLoadingMessages = true; // Prevent multiple simultaneous requests
    this.offset += this.limit; // Increase the offset to load older messages
    if (this.recipientID){
       this.websocketService
      .getPaginatedMessages(this.recipientID, this.limit, this.offset)
      .subscribe((response: LoadedMessages) => {
        console.log(response.messages);
        const previousHeight = this.messagesContainer.nativeElement.scrollHeight;
        this.messages = [...response.messages.reverse(), ...this.messages]; // Prepend older messages
        setTimeout(() => {
          const newHeight = this.messagesContainer.nativeElement.scrollHeight;
          this.messagesContainer.nativeElement.scrollTop = newHeight - previousHeight; // Maintain scroll position
        }, 100);
        this.isLoadingMessages = false; // Allow more requests after this one is done
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
