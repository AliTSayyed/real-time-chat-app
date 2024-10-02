import { HttpClient } from '@angular/common/http';
import { Component, Input } from '@angular/core';
import { ThreadData } from '../../../../types';
import { ChatService } from '../../core/services/chat.service';

@Component({
  selector: 'app-contacts',
  templateUrl: './contacts.component.html',
  styleUrl: './contacts.component.scss'
})
export class ContactsComponent {
  threads: ThreadData[] = [];
  @Input() userID: number | null = null;

  constructor(private http: HttpClient, private contactToChatService: ChatService) {}

  ngOnInit(): void {
    this.getThreads();
  }

  getThreads(): void {
    this.http.get('http://localhost:8000/api/threads/').subscribe((response: any) => {
      this.threads = response.threads;
      console.log(this.threads)
    });
  }

  // use the shared chat service to obtain the contact data (both usernames and ids) to send to the chat component by saving it to the behavior subject. 
  selectContactForChat(sendDataToChat: ThreadData){
    this.contactToChatService.selectChat(sendDataToChat);
  }
}
