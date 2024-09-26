import { Component, Input, SimpleChanges } from '@angular/core';
import { WebsocketService } from '../../core/services/websocket.service';
import { Subscription } from 'rxjs';
import { ChatMessage } from '../../../../types';

@Component({
  selector: 'app-chat',
  templateUrl: './chat.component.html',
  styleUrl: './chat.component.scss',
})
export class ChatComponent {
  @Input() userID: number | null = null;
  recipientID: number | null = null;

  message: string = '';
  messages: ChatMessage[] = []; // list of messages to display in the thread
  private messageSubscription!: Subscription; // declares a class property in TypeScript that will hold a subscription to an RxJS observable
  private previousMessagesSubscription!: Subscription;

  constructor(private websocketService: WebsocketService) {}

  // push all messages on chat load
  ngOnInit() {
    this.messageSubscription = this.websocketService
      .getMessages()
      .subscribe((msg: ChatMessage) => {
        this.messages.push(msg);
      });
  }

  // Detect changes in userID and fetch messages when available
  ngOnChanges(changes: SimpleChanges) {
    // temporary logic, will update it to be dynamic for all users.
    if (changes['userID'] && this.userID) {
      // Check recipientID based on userID
      if (this.userID === 1) {
        this.recipientID = 2;
      } else {
        this.recipientID = 1;
      }

    // Fetch previous messages for the current thread
    if (this.recipientID) {
      this.previousMessagesSubscription = this.websocketService
        .getPreviousMessages(this.recipientID)
        .subscribe((response: any) => {
          this.messages = response.messages; // Extract the 'messages' array from the response
          console.log(response.messages)
        });
      }
    }
  }

  // when a user sends a message, need to send the message content, the user id who sent the message, and the id of the recipient
  sendMessage() {
    if (this.message !== '') {
      this.websocketService.send(this.message, this.userID, this.recipientID);
    }
    this.message = '';
  }
}
