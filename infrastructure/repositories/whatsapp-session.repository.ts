import { Inject, Injectable } from '@nestjs/common';
import { CACHE_PORT } from '../../domain/tokens/cache.token';
import { CachePort } from '../../domain/ports/cache.port';

@Injectable()
export class WhatsAppSessionRepository {
  constructor(
    @Inject(CACHE_PORT)
    private readonly cache: CachePort,
  ) {}

  /**
   * Guarda el QR temporalmente para un usuario (TTL: 2 minutos)
   */
  async saveQr(userUid: string, qr: string): Promise<void> {
    await this.cache.set(`qr:${userUid}`, qr, 120);
  }

  /**
   * Obtiene el QR temporal de Redis si existe
   */
  async getQr(userUid: string): Promise<string | null> {
    return await this.cache.get<string>(`qr:${userUid}`);
  }

  /**
   * Guarda la última actividad del usuario (TTL: 30 días)
   */
  async saveLastActivity(userUid: string, timestamp: number): Promise<void> {
    await this.cache.set(`activity:${userUid}`, timestamp, 60 * 60 * 24 * 30);
  }

  /**
   * Obtiene la última actividad del usuario desde Redis
   */
  async getLastActivity(userUid: string): Promise<number | null> {
    return await this.cache.get<number>(`activity:${userUid}`);
  }

  /**
   * Guarda el estado actual de la sesión ('ready', 'auth_failed', etc.)
   */
  async setStatus(userUid: string, status: string): Promise<void> {
    await this.cache.set(`status:${userUid}`, status);
  }

  /**
   * Borra todos los datos en cache de un usuario
   */
  async clearSessionData(userUid: string): Promise<void> {
    await Promise.all([
      this.cache.del(`qr:${userUid}`),
      this.cache.del(`status:${userUid}`),
      this.cache.del(`activity:${userUid}`),
    ]);
  }

  /**
   * Elimina solo el QR si se desea limpiar manualmente
   */
  async clearQr(userUid: string): Promise<void> {
    await this.cache.del(`qr:${userUid}`);
  }
}
