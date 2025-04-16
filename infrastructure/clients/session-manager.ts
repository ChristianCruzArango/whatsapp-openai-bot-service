import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client, LocalAuth } from 'whatsapp-web.js';
import { SESSION_REPOSITORY } from '../../domain/tokens/session-repository.token';
import { WhatsAppSessionRepositoryPort } from '../../domain/ports/session.repository';
import { QueuePort } from '../../domain/ports/queue.port';
import { QUEUE_PORT } from '../../domain/tokens/queue.token';
import * as QRCode from 'qrcode';

@Injectable()
export class WhatsAppSessionManager {
  private clients = new Map<string, Client>();
  private clientTimestamps = new Map<string, number>();
  private readyStatus = new Map<string, boolean>();
  private lastActivity = new Map<string, number>();

  private readonly MAX_CLIENTS: number;
  private readonly MAX_INACTIVITY_DAYS = 30;

  constructor(
    @Inject(QUEUE_PORT)
    private readonly messageQueue: QueuePort,
    private readonly configService: ConfigService,
    @Inject(SESSION_REPOSITORY)
    private readonly sessionRepo: WhatsAppSessionRepositoryPort,
  ) {
    this.MAX_CLIENTS = Number(
      this.configService.get('WHATSAPP_MAX_CLIENTS') ?? 30,
    );

    setInterval(() => this.clearLongInactiveClients(), 24 * 60 * 60 * 1000);
  }

  async getOrCreateClient(
    userUid: string,
  ): Promise<{ client: Client; qr?: string }> {
    if (this.clients.has(userUid)) {
      this.clientTimestamps.set(userUid, Date.now());
      return { client: this.clients.get(userUid)! };
    }

    if (this.clients.size >= this.MAX_CLIENTS) {
      this.evictOldestClient();
    }

    return new Promise((resolve, reject) => {
      const client = new Client({
        authStrategy: new LocalAuth({ clientId: userUid }),
        puppeteer: {
          headless: true,
          args: ['--no-sandbox', '--disable-setuid-sandbox'],
        },
      });

      this.clients.set(userUid, client);
      this.clientTimestamps.set(userUid, Date.now());

      client.on('qr', async (qr) => {
        console.log(`QR generado para ${userUid}`);
        const base64 = await QRCode.toDataURL(qr);
        console.log(base64); // 👉 puedes devolver esto desde un endpoint para verlo en frontend
        await this.sessionRepo.saveQr(userUid, qr);
        resolve({ client, qr });
      });

      client.on('ready', async () => {
        console.log(`Cliente WhatsApp ${userUid} listo`);
        this.readyStatus.set(userUid, true);
        await this.sessionRepo.setStatus(userUid, 'ready');
        this.registerActivity(userUid);

        // 👉 Encolamos el mensaje para que lo procese el worker
        client.on('message', async (message) => {
          console.log(`📥 Mensaje recibido de ${message.from}`);
          this.registerActivity(userUid);

          console.log('📨 Encolando mensaje para BullMQ:', {
            userUid,
            from: message.from,
            message: message.body,
          });

          await this.messageQueue.enqueue('process-incoming-message', {
            userUid,
            from: message.from,
            message: message.body,
          });
        });
      });

      client.on('auth_failure', async (msg) => {
        console.error(`Falló autenticación WhatsApp ${userUid}:`, msg);
        client.destroy();
        this.cleanClient(userUid);
        await this.sessionRepo.setStatus(userUid, 'auth_failed');
        reject(new Error(msg));
      });

      client.on('disconnected', async () => {
        console.warn(`Cliente WhatsApp ${userUid} desconectado`);
        this.cleanClient(userUid);
        await this.sessionRepo.setStatus(userUid, 'disconnected');
      });

      client.initialize();
    });
  }

  isClientReady(userUid: string): boolean {
    return this.readyStatus.get(userUid) ?? false;
  }

  getClient(userUid: string): Client | undefined {
    return this.clients.get(userUid);
  }

  async getQrFromCache(userUid: string): Promise<string | null> {
    return await this.sessionRepo.getQr(userUid);
  }

  async getLastActivity(userUid: string): Promise<number | null> {
    return await this.sessionRepo.getLastActivity(userUid);
  }

  async forceCloseSession(userUid: string): Promise<{ message: string }> {
    const client = this.clients.get(userUid);
    if (!client) {
      return { message: 'Sesión no estaba activa' };
    }

    client.destroy();
    this.cleanClient(userUid);
    await this.sessionRepo.clearSessionData(userUid);

    return { message: 'Sesión cerrada manualmente' };
  }

  getClientCount(): number {
    return this.clients.size;
  }

  private evictOldestClient() {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;

    for (const [userUid, timestamp] of this.clientTimestamps.entries()) {
      if (timestamp < oldestTime) {
        oldestTime = timestamp;
        oldestKey = userUid;
      }
    }

    if (oldestKey) {
      const client = this.clients.get(oldestKey);
      if (client) {
        console.log(`Cerrando sesión menos usada: ${oldestKey}`);
        client.destroy();
        this.cleanClient(oldestKey);
      }
    }
  }

  private cleanClient(userUid: string) {
    const client = this.clients.get(userUid);
    client?.destroy();

    this.clients.delete(userUid);
    this.clientTimestamps.delete(userUid);
    this.readyStatus.delete(userUid);
    this.lastActivity.delete(userUid);
  }

  registerActivity(userUid: string) {
    const now = Date.now();
    this.lastActivity.set(userUid, now);
    this.clientTimestamps.set(userUid, now);
    this.sessionRepo.saveLastActivity(userUid, now);
  }

  private async clearLongInactiveClients() {
    const now = Date.now();
    const maxInactiveTime = this.MAX_INACTIVITY_DAYS * 24 * 60 * 60 * 1000;

    for (const [userUid] of this.clients.entries()) {
      const last = await this.sessionRepo.getLastActivity(userUid);
      if (!last) continue;

      const isInactive = now - last > maxInactiveTime;
      if (isInactive) {
        console.log(
          `Eliminando cliente inactivo por más de ${this.MAX_INACTIVITY_DAYS} días: ${userUid}`,
        );
        this.cleanClient(userUid);
        await this.sessionRepo.clearSessionData(userUid);
      }
    }
  }
}
