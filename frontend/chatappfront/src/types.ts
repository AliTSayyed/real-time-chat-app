// sent messages and in memeory stored messages.
export interface ChatMessage {
  type: string;
  message: string;
  sender_id: number | null;
  recipient_id: number | null;
  timestamp: string;
  sender_username?: string;
  is_read: boolean;
  message_id: number;
}

// messages that have been fethced from backend database. Can add more attributes later.
export interface LoadedMessages {
  messages: ChatMessage[];
  has_more?: boolean;
}

// thread interface for the contacts component, and send that data over to the selected chat component.
export interface ThreadData {
  sender_username: string;
  recipient_username: string;
  sender_id: number;
  recipient_id: number;
  messages: {
    message_sender_id: number | null;
    latest_message: string;
    timestamp: string;
    is_read: boolean;
  };
}

// Message to and from backend when a recipient user starts typing 
export interface TypingStart {
  type: string;
  sender_id: number;
  recipient_id: number;
}

// Message to and from backend when a recipient user stops typing 
export interface TypingStop {
  type: string;
  sender_id: number;
  recipient_id: number;
}

// Message to and from backend when a recipient user reads a message the user sent.
export interface ReadReceipt {
  type: string;
  message_id: number;
  is_read: boolean;
}
