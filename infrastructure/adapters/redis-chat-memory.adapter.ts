import { Injectable, Inject } from "@nestjs/common";
import { CachePort } from "../../domain/ports/cache.port";
import { ChatMemoryPort } from "../../domain/ports/chat-memory.port";
import { CACHE_PORT } from "../../domain/tokens/cache.token";

@Injectable()
export class RedisChatMemoryAdapter implements ChatMemoryPort {
  constructor(@Inject(CACHE_PORT) private readonly cache: CachePort) {}

  private getKey(userUid: string): string {
    return `chat-history:${userUid}`;
  }

  async saveMessage(
    userUid: string,
    role: "system" | "user" | "assistant",
    content: string
  ): Promise<void> {
    console.log(role);
    if (role === "system") return;

    const key = this.getKey(userUid);
    const entry = { role, content, timestamp: Date.now() };

    const raw = await this.cache.get<string>(key);
    const history: any[] = raw ? JSON.parse(raw) : [];

    console.log(`🧠 Guardando en Redis key: ${key}`);
    console.log("🧠 Anterior historial:", history);

    history.unshift(entry);
    const trimmed = history.slice(0, 10);

    console.log("🧠 Nuevo historial guardado en Redis:", trimmed);

    await this.cache.set(key, JSON.stringify(trimmed), 60 * 60);
  }

  async getRecentMessages(
    userUid: string,
    limit = 10
  ): Promise<{ role: "system" | "user" | "assistant"; content: string }[]> {
    const key = this.getKey(userUid);
    const raw = await this.cache.get<string>(key);
    const parsed = raw ? JSON.parse(raw) : [];

    return parsed.slice(0, limit).map((item: any) => ({
      role: item.role as "system" | "user" | "assistant",
      content: item.content,
    }));
  }
}
