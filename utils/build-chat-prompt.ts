import { ChatMessage } from "../domain/models/chat-message.model";

/**
 * Genera el historial para enviar a OpenAI, comenzando con un mensaje de tipo `system`.
 * @param history Mensajes previos del usuario desde Redis
 * @returns Mensajes completos para OpenAI
 */
export function buildPromptWithSystem(
  history: ChatMessage[],
  systemPrompt: string = "Mensaje que se le enviara a la ia" // 🧠 Puedes personalizar este prompt
): ChatMessage[] {
  return [
    {
      role: "system",
      content: systemPrompt,
    },
    ...history,
  ];
}
