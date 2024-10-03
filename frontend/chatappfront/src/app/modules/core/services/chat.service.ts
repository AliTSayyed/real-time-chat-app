import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { ThreadData } from '../../../../types';

@Injectable({
  providedIn: 'root'
})
export class ChatService {
  // purpose of this service is to send over the data from the contacts component to the chat component so that the right chat it pulled up when the respective contact is clicked on the side pannel.
  // create a BehaviorSubject to hold the selected chat data (sender_id, recipient_id, and recipient username)
  private selectedChatSource = new BehaviorSubject<{sendDataToChat: ThreadData} | null>(null);

  constructor() { }

  // method to get the contacts data as an observable
  getSelectedChatData(){
    return this.selectedChatSource.asObservable();
  }

  // method to send the contact data to the BehaviorSubject 
  selectChat(sendDataToChat: ThreadData){
    this.selectedChatSource.next({sendDataToChat})
  }
}
