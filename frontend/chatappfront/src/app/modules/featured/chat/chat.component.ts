import {
  AfterViewChecked,
  Component,
  ElementRef,
  Input,
  ViewChild,
} from '@angular/core';
import { WebsocketService } from '../../core/services/websocket.service';
import { Subscription } from 'rxjs';
import { ChatMessage, LoadedMessages, ReadReceipt } from '../../../../types';
import { ChatService } from '../../core/services/chat.service';
import { LastmessageService } from '../../core/services/lastmessage.service';

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

  // private messageSubscription!: Subscription; // creates a subscription to all current messages being sent.
  // private dbMessagesSubscription!: Subscription; // creates a subscription to all messages from the database.

  @ViewChild('messagesContainer') private messagesContainer!: ElementRef; // view child to access DOM of the chats to automatically scroll down

  scrollAtBottom: boolean = true; // Track if the user is already at the bottom
  lastScrollTop: number = 0; // Track the last scroll position to detect scroll direction

  isLoadingMessages: boolean = false; // var to keep track if user is trying to load more messages
  offset: number = 0; // start at the latest message for splicing the response messages
  limit: number = 20; // load 20 more messages on scroll up

  chatMessage: ChatMessage = {
    // chat message object that will store the message and details sent by the user.
    type: 'chat_message',
    message: '',
    sender_id: null,
    recipient_id: null,
    timestamp: '',
    is_read: false,
    message_id: -1,
  };

  isTyping: boolean = false; // boolean to let recipient know user is typing
  typingTimeout: any; // var to store a timeout object

  constructor(
    private websocketService: WebsocketService,
    private chatService: ChatService,
    private lastMessageService: LastmessageService
  ) {}

  // send is typing to backend when user start typing
  onUserTyping() {
    if (!this.isTyping) {
      this.isTyping = true;
      this.websocketService.isTyping(this.userID, this.recipientID);
    }
    // Clear any previous set timeout to send a stop typing message
    clearTimeout(this.typingTimeout);

    // set a timeout to send a stop typing message to the backend after 2 seconds of no user typing
    this.typingTimeout = setTimeout(() => {
      this.isTyping = false; // this will restart the typing start message on user interaction after 2 seconds of inactivity.
      this.websocketService.stoppedTyping(this.userID, this.recipientID);
    }, 2000);
  }

  // Function to determine if the user is at the bottom of the chat
  isUserAtBottom(): boolean {
    const threshold = 50; // Allow some leeway for the user to be considered at the bottom
    const position =
      this.messagesContainer.nativeElement.scrollTop +
      this.messagesContainer.nativeElement.offsetHeight;
    const height = this.messagesContainer.nativeElement.scrollHeight;
    return position > height - threshold; // User is at the bottom or very close
  }

  // Detect whether the user is scrolling up or down
  detectUserScrollDirection(): boolean {
    const currentScrollTop = this.messagesContainer.nativeElement.scrollTop;
    const isScrollingUp = currentScrollTop < this.lastScrollTop; // If the current scroll position is less than the last one, the user is scrolling up
    this.lastScrollTop = currentScrollTop; // Update the last scroll position
    return isScrollingUp;
  }

  // function listening to when users are scrolling all the way up to load previous messages.
  onScrollMaxUp() {
    const isScrollingUp = this.detectUserScrollDirection();
    const isAtTop = this.messagesContainer.nativeElement.scrollTop === 0;

    // Load previous messages when user scrolls to the top
    if (isAtTop && !this.isLoadingMessages) {
      this.loadPreviousMessages();
    }

    // If the user is scrolling up, stop auto-scrolling to the bottom
    if (isScrollingUp) {
      this.scrollAtBottom = false;
    } else {
      this.scrollAtBottom = this.isUserAtBottom();
    }
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
    if (this.activeChat) {
      if (this.scrollAtBottom) {
        this.scrollToBottom();
      }
    }
  }

  // push all realtime messages sent by the users (stored in mememory and then the database, but on page refresh will these messages then only be loaded by the database.)
  ngOnInit() {
    this.websocketService.getMessages().subscribe((msg: ChatMessage) => {
      this.messages.push(msg);
      this.lastMessageService.updateLatestMessage(msg); // send real time message to the contacts component to update latest message preivew.
      // scroll down when new message is sent or received
      if (this.scrollAtBottom) {
        this.scrollToBottom();
      }
      if (this.activeChat) {
        this.markMessagesAsRead(); // mark all real messages on the recipient side as read if they are looking at the chat.
      }
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
        this.loadInitalMessages(); // after a thread is selected then load the messages
      }
    });

    // any message that is viewed by the recipient will be accessed via the readReceiptSubscription and then the message will be marked as read.
    this.websocketService
      .getReadRecipts()
      .subscribe((readReceipt: ReadReceipt) => {
        const message = this.messages.find(
          (msg) => msg.message_id === readReceipt.message_id
        );
        if (message) {
          message.is_read = true; // mark the sender's message as read if the recipient has viewed the message.
        }
      });
  }

  loadInitalMessages() {
    // Fetch previous messages (but not all messages at once) for the current thread between the logged in user and the recipient user.
    if (this.recipientID) {
      const limit = 30; // start from the last 30 message sent on chat load.
      this.offset = 0; // always start offset at 0 when chat loads.
      this.websocketService
        .getPaginatedMessages(this.recipientID, limit, this.offset)
        .subscribe((response: LoadedMessages) => {
          // after getting all the messages as an observable then subscribe to it
          this.messages = response.messages.reverse(); // Extract the 'messages' array from the response and reverse their order.
          console.log(response); // log the entire chat with other user from database.
          // scroll to bottom after loading all the messages.
          if (this.scrollAtBottom) {
            this.scrollToBottom();
          }
          this.markMessagesAsRead(); // after a thread is selected and the messages have loaded, mark all messages on the recipient side as read.
        });
      this.offset += 10; // becuase we only load the next 20 items, need to adjust the offset by 10 to not reaload the last 10 items from the fethced 30 items.
    }
  }

  // purpose of this function is to share to the other user what messages have been read and which have not been read. When the page loads.
  markMessagesAsRead() {
    const unreadMessages = this.messages.filter(
      (msg) => msg.sender_id !== this.userID && !msg.is_read
    );
    unreadMessages.forEach((msg) => {
      this.websocketService.sendReadReceipt(msg.message_id, msg.sender_id); // mark the recipient (sender in this case) as read
    });
  }

  // function to load previous messages in the thread, so thread does not need to load all messages on chat load.
  loadPreviousMessages() {
    this.isLoadingMessages = true; // Prevent multiple simultaneous requests
    this.offset += this.limit; // Increase the offset to load older messages
    if (this.recipientID) {
      this.websocketService
        .getPaginatedMessages(this.recipientID, this.limit, this.offset)
        .subscribe((response: LoadedMessages) => {
          console.log(response.messages);
          const previousHeight =
            this.messagesContainer.nativeElement.scrollHeight;
          this.messages = [...response.messages.reverse(), ...this.messages]; // Prepend older messages
          setTimeout(() => {
            const newHeight = this.messagesContainer.nativeElement.scrollHeight;
            this.messagesContainer.nativeElement.scrollTop =
              newHeight - previousHeight; // Maintain scroll position
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
        type: 'chat_message',
        message: this.userMessage,
        sender_id: this.userID,
        recipient_id: this.recipientID,
        timestamp: '',
        is_read: false,
        message_id: -1,
      };

      this.websocketService.send(this.chatMessage);
      this.websocketService.stoppedTyping(this.userID, this.recipientID); // end the 'is typing...' preview after message is sent.
      clearTimeout(this.typingTimeout); // Stop typing notification when message is sent
      this.isTyping = false;
    }
    this.userMessage = '';
  }
}
