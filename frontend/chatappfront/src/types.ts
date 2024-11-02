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
  thread_id: number | null;    
  is_recipient_active?: boolean
}

// messages that have been fethced from backend database. Can add more attributes later.
export interface LoadedMessages {
  messages: ChatMessage[];
  has_more?: boolean;
}

// thread interface for the contacts component, and send that data over to the selected chat component.
export interface ThreadData {
  id: number;
  sender_username: string;
  recipient_username: string;
  sender_id: number;
  recipient_id: number;
  messages: {
    message_sender_id: number | null;
    latest_message: string;
    timestamp: string;
    is_read: boolean;
    message_id: number | null; 
  };
  unreadCount?: number;  
}

// Message to and from backend when a recipient user starts typing 
export interface TypingStart {
  type: string;
  sender_id: number;
  recipient_id: number;
  thread_id: number;
}

// Message to and from backend when a recipient user stops typing 
export interface TypingStop {
  type: string;
  sender_id: number;
  recipient_id: number;
  thread_id: number;
}

// Message to and from backend when a recipient user reads a message the user sent.
export interface ReadReceipt {
  type: string;
  message_id: number;
  is_read: boolean;
  thread_id: number;   
}

// chaches searched users in the search bar. 
export interface SearchCache {
  results: any[];
  timestamp: number;
}

// user model
export interface User {
  id: number;
  username: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  display_name?: string;
  avatar_url?: string;
  thread_exists?: boolean;
  last_active?: Date | string;
  created_at?: Date | string;
  updated_at?: Date | string;
}

// unread counts
export interface ThreadUnreadCounts {
  [threadId: number]: number;
}

// unread counts message from backend
export interface UnreadCountsMessage {
  type: 'unread_counts';
  total_unread: number;
  thread_counts: ThreadUnreadCounts;
}

export interface UserStatus{
  type: 'user_status';
  user_id: number;
  status: 'online' | 'offline';
}

// Union type for all possible WebSocket message types
export type WebSocketMessage = 
  | ChatMessage 
  | TypingStart 
  | TypingStop 
  | ReadReceipt 
  | UnreadCountsMessage
  |UserStatus;