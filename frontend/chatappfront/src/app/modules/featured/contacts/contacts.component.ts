import { HttpClient } from '@angular/common/http';
import { Component, Input, input, OnChanges } from '@angular/core';
import { ChatMessage, ThreadData, TypingStart, TypingStop } from '../../../../types';
import { ChatService } from '../../core/services/chat.service';
import { LastmessageService } from '../../core/services/lastmessage.service';
import { WebsocketService } from '../../core/services/websocket.service';

@Component({
  selector: 'app-contacts',
  templateUrl: './contacts.component.html',
  styleUrl: './contacts.component.scss'
})
export class ContactsComponent implements OnChanges {
  @Input() isAuthenticated: boolean = false;
  threads: ThreadData[] = [];
  selectedThread: ThreadData | null = null;
  typingRecipient:{[id: number]: boolean} = {};

  constructor(private http: HttpClient, private contactToChatService: ChatService, private lastMessageService: LastmessageService, private websocketService: WebsocketService) {}
  
  // load all chats a user has after the user has been authenticated. 
  ngOnChanges(){  
    if (this.isAuthenticated){
      this.getThreads();
    }
  }
  
  ngOnInit(): void {
    // get the last message sent in the thread and display it in the preview
    this.lastMessageService.getLatestMessage().subscribe((message: ChatMessage | null) => {
      if (message !== null && message.type === 'chat_message') {
        this.updateMessagePreview(message);
      }
    });
    // check if recipient "is typing..."
    this.websocketService.getTypingStatus().subscribe((msg: TypingStart | TypingStop) => {
      const thread = this.threads.find( // find the correct thread to update typing status 
        thread =>  (thread.recipient_id === msg.recipient_id && thread.sender_id === msg.sender_id) || 
        (thread.recipient_id === msg.sender_id && thread.sender_id === msg.recipient_id)
      ) 
      if (thread) { // if the typing start message has the sender of the user recipient, then that recipient is typing. 
          if (msg.type === 'typing_start' && msg.sender_id === thread.recipient_id) {
          this.typingRecipient[msg.sender_id] = true; // mark recipient user as typing 
          console.log(msg.sender_id, 'is typing right now');
        } else if (msg.type === 'typing_stop'  && msg.sender_id === thread.recipient_id) {
          this.typingRecipient[msg.sender_id] = false; // mark recipient user as no longer typing
          console.log(msg.sender_id, 'has stopped typing');
        }
      }
    });
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
