import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength, IsEmail } from 'class-validator';

export class SetPasswordDto {
  @ApiProperty({
    example: '',
    description: 'Código del cliente ERP',
  })
  @IsNotEmpty({ message: 'El código del cliente es obligatorio.' })
  @IsString({ message: 'El código del cliente debe ser texto.' })
  codigoCliente: string;

  @ApiProperty({
    example: 'MiNuevaClave2025',
    description: 'Nueva contraseña del cliente',
  })
  @IsNotEmpty({ message: 'La contraseña es obligatoria.' })
  @IsString({ message: 'La contraseña debe ser un texto válido.' })
  @MinLength(6, { message: 'La contraseña debe tener al menos 6 caracteres.' })
  nuevaPassword: string;

  @ApiProperty({
    example: 'cliente@ejemplo.com',
    description: 'Correo electrónico del cliente para recuperación',
  })
  @IsNotEmpty({ message: 'El correo electrónico es obligatorio.' })
  @IsEmail({}, { message: 'El formato del correo electrónico no es válido.' })
  email: string;
}
