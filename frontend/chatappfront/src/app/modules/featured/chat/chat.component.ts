import { Component } from '@angular/core';
import { WebsocketService } from '../../core/services/websocket.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-chat',
  templateUrl: './chat.component.html',
  styleUrl: './chat.component.scss',
})
export class ChatComponent {
  message: string = '';
  messages: string[] = []; // list of messages to display in the thread
  private messageSubscription!: Subscription; // declares a class property in TypeScript that will hold a subscription to an RxJS observable

  constructor(private websocketService: WebsocketService) {}

  // push all messages on chat load
  ngOnInit(){
    this.messageSubscription = this.websocketService.getMessages().subscribe((msg: string) => {
      this.messages.push(msg);
    })
  }

  sendMessage() {
    if (this.message !== '') {
      this.websocketService.send(this.message);
    }
    this.message = '';
  }
}
