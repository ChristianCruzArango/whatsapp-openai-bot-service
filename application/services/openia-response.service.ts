import { Inject, Injectable } from "@nestjs/common";
import { OPENAI_PORT } from "../../domain/tokens/openai.token";
import { OpenAiPort } from "../../domain/ports/openai.port";
import { ChatMessage } from "../../domain/models/chat-message.model";

/**
 * Genera una respuesta desde la IA a partir de un único mensaje del usuario.
 *
 * Esta función es útil para casos simples donde no se requiere historial de conversación,
 * como pruebas rápidas, endpoints de prueba o interacciones sin contexto previo.
 *
 * @param message El mensaje del usuario que se desea enviar a la IA.
 * @returns La respuesta generada por la IA.
 */
@Injectable()
export class AiResponseService {
  constructor(@Inject(OPENAI_PORT) private readonly ai: OpenAiPort) {}

  async generateReply(message: string): Promise<string> {
    const messages: ChatMessage[] = [
      {
        role: "system",
        content: "Mensaje que se le enviara a la ia", // 🧠 Puedes personalizar este prompt
      },
      {
        role: "user",
        content: message,
      },
    ];

    return await this.ai.generateResponse(messages);
  }
}
