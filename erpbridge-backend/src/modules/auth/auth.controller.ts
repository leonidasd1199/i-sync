import { Controller, Post, Get, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBody, ApiParam } from '@nestjs/swagger';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { SetPasswordDto } from './dto/set-password.dto';

@ApiTags('Auth')
@UseGuards(ThrottlerGuard)
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiOperation({ summary: 'Client login' })
  @ApiBody({
    schema: {
      example: { codigoCliente: 'C1234', password: 'SecurePass2025' },
    },
  })
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Get('check-password/:codigo')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({ summary: 'Check if client has a password set' })
  @ApiParam({ name: 'codigo', example: 'C1234' })
  async checkPassword(@Param('codigo') codigo: string) {
    return this.authService.checkPasswordStatus(codigo);
  }

  @Post('set-password')
  @ApiOperation({ summary: 'Set or update client password and email' })
  @ApiBody({
    schema: {
      example: {
        codigoCliente: 'C1234',
        nuevaPassword: 'NewSecurePass2025',
        email: 'client@example.com',
      },
    },
  })
  async setPassword(@Body() dto: SetPasswordDto) {
    const { codigoCliente, nuevaPassword, email } = dto;
    return this.authService.setPassword(codigoCliente, nuevaPassword, email);
  }

  @Post('forgot-password')
  @Throttle({ default: { limit: 3, ttl: 600000 } })
  @ApiOperation({ summary: 'Send password reset email' })
  @ApiBody({
    schema: {
      example: { codigoCliente: 'C1234' },
    },
  })
  async forgotPassword(@Body('codigoCliente') codigoCliente: string) {
    return this.authService.sendPasswordResetEmail(codigoCliente);
  }

  @Get('verify-reset-token')
  @ApiOperation({ summary: 'Verify a password reset token' })
  async verifyResetToken(@Query('token') token: string) {
    return this.authService.verifyResetToken(token);
  }

  @Post('reset-password')
  @ApiOperation({ summary: 'Reset password using a token from email' })
  @ApiBody({
    schema: {
      example: {
        token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        newPassword: 'NewSecurePass2025',
      },
    },
  })
  async resetPassword(
    @Body('token') token: string,
    @Body('newPassword') newPassword: string,
  ) {
    return this.authService.resetPassword(token, newPassword);
  }
}
