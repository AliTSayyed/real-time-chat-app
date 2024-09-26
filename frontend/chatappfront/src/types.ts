export interface ChatMessage {
  message: string;
  sender_id: number;
  recipient_id: number;
  timestamp?: string;
}
