import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'C1234', description: 'Código del cliente ERP' })
  @IsNotEmpty()
  @IsString()
  codigoCliente: string;

  @ApiProperty({ example: 'MiClaveSegura2025', description: 'Contraseña del cliente (si ya fue configurada)' })
  @IsNotEmpty()
  @IsString()
  password: string;
}
