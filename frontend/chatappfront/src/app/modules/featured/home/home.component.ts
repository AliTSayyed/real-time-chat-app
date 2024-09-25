import { Component } from '@angular/core';
import { WebsocketService } from '../../core/services/websocket.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss'
})
export class HomeComponent {

  isAuthenticated: boolean = false;
  username: string | null = null

  constructor(private websocketService:WebsocketService, private authService: AuthService){}

  // connect to the server on page load once
  ngOnInit(){
    this.websocketService.connect();
    this.authService.checkAuthentication().subscribe({
      next: (response) => {
        this.isAuthenticated = response.is_authenticated;
        this.username = response.username;
      },
      error: (error) => {
        this.isAuthenticated = false;
        this.username = null;
      }
    });
  }
  
  // disconnect from websocket when page is closed
  ngOnDestroy() {
    this.websocketService.disconnect();
  }
}
