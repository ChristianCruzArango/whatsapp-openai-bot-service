import { Inject, Injectable, OnModuleInit } from "@nestjs/common";
import { Worker, Job } from "bullmq";
import { ConfigService } from "@nestjs/config";

import { CHAT_MEMORY_PORT } from "../../domain/tokens/chat-memory.token";
import { ChatMemoryPort } from "../../domain/ports/chat-memory.port";

import { WhatsAppSessionManager } from "../../infrastructure/clients/session-manager";

import { OPENAI_PORT } from "../../domain/tokens/openai.token";
import { OpenAiPort } from "../../domain/ports/openai.port";
import { buildPromptWithSystem } from "../../utils/build-chat-prompt";

@Injectable()
export class ProcessIncomingMessageJob implements OnModuleInit {
  private worker: Worker;

  constructor(
    private readonly configService: ConfigService,
    @Inject(CHAT_MEMORY_PORT)
    private readonly chatMemory: ChatMemoryPort,
    @Inject(OPENAI_PORT)
    private readonly openai: OpenAiPort,
    private readonly whatsappSessionManager: WhatsAppSessionManager
  ) {}

  onModuleInit() {
    const redisUrl = this.configService.get<string>("REDIS_URL");
    if (!redisUrl) {
      throw new Error("❌ REDIS_URL no está definido en el archivo .env");
    }

    this.worker = new Worker(
      "whatsapp-messages",
      async (job: Job) => {
        const { userUid, from, message } = job.data;

        console.log(`💬 Procesando mensaje: ${message}1234`);
        console.log("🔧 REDIS_URL =>", this.configService.get("REDIS_URL"));

        // 1️⃣ Guardamos mensaje del usuario
        await this.chatMemory.saveMessage(userUid, "user", message);

        // 2️⃣ Obtenemos historial reciente
        const rawHistory = await this.chatMemory.getRecentMessages(userUid);

        // 🔁 Normalizamos al tipo ChatMessage
        const filteredHistory = rawHistory
          .filter((m) => ["user", "assistant"].includes(m.role))
          .map((m) => ({
            role: m.role as "user" | "assistant",
            content: m.content,
          }));

        const history = buildPromptWithSystem(filteredHistory);

        // 3️⃣ Generamos respuesta
        const response = await this.openai.generateResponse(history);

        // 4️⃣ Guardamos respuesta del bot
        await this.chatMemory.saveMessage(userUid, "assistant", response);

        // 5️⃣ Enviamos respuesta por WhatsApp
        const client = this.whatsappSessionManager.getClient(userUid);
        if (client && this.whatsappSessionManager.isClientReady(userUid)) {
          await client.sendMessage(from, response);
          this.whatsappSessionManager.registerActivity(userUid);
        }
      },
      {
        connection: { url: redisUrl },
      }
    );

    this.worker.on("failed", (job, err) => {
      console.error(`❌ Job fallido: ${job?.id}`, err);
    });

    console.log("👷 Worker BullMQ escuchando en: whatsapp-messages");
  }
}
