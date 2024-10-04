// sent messages and in memeory stored messages. 
export interface ChatMessage {
  message: string;
  sender_id: number | null;
  recipient_id?: number | null;
  timestamp: string;
  sender_username?: string,
}

// messages that have been fethced from backend database. Can add more attributes later. 
export interface LoadedMessages {
  messages: ChatMessage[]
}

// thread interface for the contacts component, and send that data over to the selected chat component. 
export interface ThreadData {
  sender_username: string,
  recipient_username: string,
  sender_id: number,
  recipient_id: number,
  messages: {
    latest_message: string,
    timestamp: string,
  }
}
