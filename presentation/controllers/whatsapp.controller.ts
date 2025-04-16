import { AuthGuard } from '@nestjs/passport';
import { Controller, Post, Get, Body, UseGuards } from '@nestjs/common';
import { SendMessageDto } from '../../dto/send-message.dto';
import { User } from '../../../../features/auth/entities';
import { GetUser } from '../../../../common/decorator/user.decorator';
import { WhatsAppService } from '../../application/services/whatsApp.service';

@Controller('whatsapp')
@UseGuards(AuthGuard('jwt'))
export class WhatsAppController {
  constructor(private readonly whatsAppService: WhatsAppService) {}

  /**
   * Inicializa o reutiliza sesión de WhatsApp para la sede del usuario autenticado.
   */
  @Post('init-session')
  initSession(@GetUser() user: User) {
    return this.whatsAppService.initSession(user.id);
  }

  /**
   * Verifica si el usuario tiene una sesión activa y lista.
   */
  @Get('status')
  checkStatus(@GetUser() user: User) {
    return this.whatsAppService.checkStatus(user.id);
  }

  /**
   * Envía un mensaje desde la sesión de WhatsApp correspondiente al usuario autenticado.
   */
  @Post('send-message')
  sendMessage(@GetUser() user: User, @Body() body: SendMessageDto) {
    return this.whatsAppService.sendMessage(user.id, body);
  }

  /**
   * Devuelve el código QR pendiente para escaneo si la sesión aún no ha sido autenticada.
   */
  @Get('qr')
  getQr(@GetUser() user: User) {
    return this.whatsAppService.getQr(user.id);
  }

  /**
   * Devuelve la última vez que hubo actividad en la sesión de WhatsApp del usuario.
   */
  @Get('last-activity')
  getLastActivity(@GetUser() user: User) {
    return this.whatsAppService.getLastActivity(user.id);
  }

  /**
   * Cierra manualmente la sesión de WhatsApp (por ejemplo, si se requiere reiniciar o limpiar estado).
   */
  @Post('close-session')
  closeSession(@GetUser() user: User) {
    return this.whatsAppService.closeSession(user.id);
  }

  /**
   * Devuelve cuántas sesiones activas están en memoria actualmente (solo para superUser o admin).
   */
  @Get('clients/active')
  getActiveClients() {
    return this.whatsAppService.getClientCount();
  }
}
