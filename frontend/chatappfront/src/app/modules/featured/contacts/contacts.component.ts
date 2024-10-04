import { HttpClient } from '@angular/common/http';
import { Component, Input } from '@angular/core';
import { ChatMessage, ThreadData } from '../../../../types';
import { ChatService } from '../../core/services/chat.service';
import { LastmessageService } from '../../core/services/lastmessage.service';

@Component({
  selector: 'app-contacts',
  templateUrl: './contacts.component.html',
  styleUrl: './contacts.component.scss'
})
export class ContactsComponent {
  threads: ThreadData[] = [];
  selectedThread: ThreadData | null = null;

  constructor(private http: HttpClient, private contactToChatService: ChatService, private lastMessageService: LastmessageService) {}

  // load all chats a user has 
  ngOnInit(): void {
    this.getThreads();
    this.lastMessageService.getLatestMessage().subscribe((message: ChatMessage | null) => {
      if (message !== null) {
        this.updateMessagePreview(message);
      }
    })
  }

  // api to get all the chats a user has 
  getThreads(): void {
    this.http.get('http://localhost:8000/api/threads/').subscribe((response: any) => {
      this.threads = response.threads;
      console.log(this.threads)
    });
  }

  // function to update the latest message sent in the thread on the contacts side panel to keep up with the realtime chat. 
  updateMessagePreview(message:ChatMessage){
    // Find the correct thread to update the message. Needs to match the thread for both users so must check if either or cases are true. 
    const thread = this.threads.find(
      thread =>  (thread.recipient_id === message.recipient_id && thread.sender_id === message.sender_id) || // update when I send a message. 
      (thread.recipient_id === message.sender_id && thread.sender_id === message.recipient_id) // update when the other user sends a message.
    );

    if (thread){
      thread.messages.latest_message = message.message;
      thread.messages.timestamp = message.timestamp;
    }
  }

  // use the shared chat service to obtain the contact data (both usernames and ids) to send to the chat component by saving it to the behavior subject. 
  selectContactForChat(sendDataToChat: ThreadData){
    this.contactToChatService.selectChat(sendDataToChat);
    this.selectedThread = sendDataToChat;
  }
}
