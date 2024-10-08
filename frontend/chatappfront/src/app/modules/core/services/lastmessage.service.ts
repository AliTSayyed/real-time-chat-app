import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { ChatMessage } from '../../../../types';

@Injectable({
  providedIn: 'root'
})
export class LastmessageService {
  // purpose of this service is to send the latest realtime message from the chat component to the contacts component. This way the contancts component will keep up with the real time messages. 
  // Use a BehaviorSubject to hold and broadcast the latest message of its respective chat and contact
  private latestMessageSubject = new BehaviorSubject<ChatMessage | null>(null);
  
  // Create an observable of the subject so components can subscribe to it
  getLatestMessage(){
    return this.latestMessageSubject.asObservable();
  }

  // Function to update the subject with the latest message
  updateLatestMessage(message: ChatMessage){
    this.latestMessageSubject.next(message); // holds on to the latest message so contact component can subscribe to it. 
  }

}
