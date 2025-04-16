import { IsString, IsNotEmpty, Matches } from 'class-validator';

export class SendMessageDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^[0-9+]+$/, { message: 'Número inválido' })
  phone: string;

  @IsString()
  @IsNotEmpty()
  message: string;
}
