import { ChatMessage } from '../models/chat-message.model';

export interface OpenAiPort {
  generateResponse(messages: ChatMessage[]): Promise<string>;
}
