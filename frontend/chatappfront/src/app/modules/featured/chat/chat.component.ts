import { Component } from '@angular/core';
import { WebsocketService } from '../../core/services/websocket.service';


@Component({
  selector: 'app-chat',
  templateUrl: './chat.component.html',
  styleUrl: './chat.component.scss'
})
export class ChatComponent {
  constructor(private websocketService:WebsocketService){}
  message: string = '';
  
  // connect to the server on page load
  ngOnInit(){
    this.websocketService.connect();
  }

  sendMessage(){
    if (this.message !== ''){
      this.websocketService.send(this.message)
    };
    this.message = '';
  }
}
