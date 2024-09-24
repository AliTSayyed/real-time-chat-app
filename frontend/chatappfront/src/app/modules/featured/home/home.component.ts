import { Component } from '@angular/core';
import { WebsocketService } from '../../core/services/websocket.service';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss'
})
export class HomeComponent {

  constructor(private websocketService:WebsocketService){}

  // connect to the server on page load once
  ngOnInit(){
    this.websocketService.connect();
  }
  
  // disconnect from websocket when page is closed
  ngOnDestroy() {
    this.websocketService.disconnect();
  }
}
