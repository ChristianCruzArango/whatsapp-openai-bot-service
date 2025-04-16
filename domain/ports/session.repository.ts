export interface WhatsAppSessionRepositoryPort {
  saveQr(userUid: string, qr: string): Promise<void>;
  getQr(userUid: string): Promise<string | null>;
  saveLastActivity(userUid: string, timestamp: number): Promise<void>;
  getLastActivity(userUid: string): Promise<number | null>;
  setStatus(userUid: string, status: string): Promise<void>;
  clearSessionData(userUid: string): Promise<void>;
  clearQr(userUid: string): Promise<void>;
}
