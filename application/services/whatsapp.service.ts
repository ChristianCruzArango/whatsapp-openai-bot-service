import { Injectable } from '@nestjs/common';
import { WhatsAppSessionManager } from '../../infrastructure/clients/session-manager';
import { SendMessageDto } from '../../dto/send-message.dto';

@Injectable()
export class WhatsAppService {
  constructor(private readonly sessionManager: WhatsAppSessionManager) {}

  /**
   * Inicia una sesión de WhatsApp (o la reutiliza si ya está activa).
   */
  async initSession(userUid: string) {
    try {
      const { qr } = await this.sessionManager.getOrCreateClient(userUid);
      return qr
        ? { message: `Sesión iniciada, escanea el código QR`, userUid, qr }
        : { message: `Sesión ya existente o ya autenticada`, userUid };
    } catch (err) {
      return {
        error: true,
        message: `Error iniciando sesión para ${userUid}`,
        details: err.message,
      };
    }
  }

  /**
   * Verifica si el cliente está conectado a WhatsApp.
   */
  checkStatus(userUid: string) {
    return {
      userUid,
      connected: this.sessionManager.isClientReady(userUid),
    };
  }

  /**
   * Envía un mensaje al número especificado usando la sesión activa.
   */
  async sendMessage(userUid: string, dto: SendMessageDto) {
    const { phone, message } = dto;

    const client = this.sessionManager.getClient(userUid);
    if (!client) {
      return { error: `❌ Sesión para el usuario ${userUid} no existe.` };
    }

    if (!this.sessionManager.isClientReady(userUid)) {
      return {
        error: `⌛ WhatsApp para el usuario ${userUid} no está listo aún.`,
      };
    }

    const chatId = this.formatChatId(phone);
    try {
      await client.sendMessage(chatId, message);
      this.sessionManager.registerActivity(userUid);
      return {
        success: true,
        message: `✅ Mensaje enviado a ${phone}`,
      };
    } catch (err) {
      console.error(`❌ Error enviando mensaje a ${phone}:`, err);
      return {
        error: `Error al enviar mensaje a ${phone}`,
        details: err.message,
      };
    }
  }

  /**
   * Formatea el número de teléfono al formato requerido por WhatsApp.
   */
  private formatChatId(phone: string): string {
    return phone.replace('+', '') + '@c.us';
  }

  /**
   * Obtiene el código QR pendiente desde el repositorio (Redis).
   */
  async getQr(userUid: string) {
    const qr = await this.sessionManager.getQrFromCache(userUid);
    return qr ? { qr } : { message: 'No hay QR pendiente' };
  }

  /**
   * Devuelve la cantidad de sesiones activas en memoria.
   */
  async getClientCount() {
    return { count: this.sessionManager.getClientCount() };
  }

  /**
   * Fuerza el cierre de una sesión de WhatsApp manualmente.
   */
  async closeSession(userUid: string) {
    return await this.sessionManager.forceCloseSession(userUid);
  }

  async getLastActivity(userUid: string) {
    const last = await this.sessionManager.getLastActivity(userUid);

    if (!last) {
      return { message: 'No hay actividad registrada para esta sesión.' };
    }

    return {
      userUid,
      lastActivity: new Date(last).toISOString(),
    };
  }
}
