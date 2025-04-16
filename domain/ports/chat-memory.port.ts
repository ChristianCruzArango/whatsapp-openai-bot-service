export interface ChatMemoryPort {
  saveMessage(
    userUid: string,
    role: "user" | "assistant" | "system",
    content: string
  ): Promise<void>;
  getRecentMessages(
    userUid: string,
    limit?: number
  ): Promise<{ role: "user" | "assistant" | "system"; content: string }[]>;
}
