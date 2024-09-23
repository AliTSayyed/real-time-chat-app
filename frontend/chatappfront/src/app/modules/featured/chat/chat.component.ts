import { Component } from '@angular/core';
import { WebsocketService } from '../../core/services/websocket.service';

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [],
  templateUrl: './chat.component.html',
  styleUrl: './chat.component.scss'
})
export class ChatComponent {
  constructor(private websocketService:WebsocketService){}
  // connect to the server on page load
  ngOnInit(){
    this.websocketService.connect();
  }
}
