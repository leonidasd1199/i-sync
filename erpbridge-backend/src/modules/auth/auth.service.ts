import {
  Injectable,
  UnauthorizedException,
  NotFoundException,
  Logger,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { ClienteLogin } from './entities/cliente-login.entity';
import { Cliempre } from '../cliente/cliente.entity';
import { LoginDto } from './dto/login.dto';
import { MailerService } from '@nestjs-modules/mailer';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(Cliempre)
    private readonly clientesRepo: Repository<Cliempre>,

    @InjectRepository(ClienteLogin)
    private readonly loginRepo: Repository<ClienteLogin>,

    private readonly jwtService: JwtService,
    private readonly mailerService: MailerService,
  ) {}

  async login(dto: LoginDto) {
    const { codigoCliente, password } = dto;

    if (!codigoCliente?.trim()) throw new BadRequestException('Debe ingresar el código de cliente.');

    const cliente = await this.clientesRepo.findOne({
      where: { codigo: codigoCliente },
      select: ['codigo', 'nombre', 'email', 'sector', 'tipo'],
    });

    if (!cliente) throw new NotFoundException('El cliente no existe.');

    if (cliente.tipo !== 'ISY')
      throw new UnauthorizedException('Cliente suspendido o inhabilitado.');

    let login = await this.loginRepo.findOne({ where: { codigoCliente } });

    if (!login) {
      const nuevo = this.loginRepo.create({
        codigoCliente,
        passwordHash: null,
        email: cliente.email || null,
        firstLogin: 1,
        lastLogin: null,
      });
      await this.loginRepo.save(nuevo);
      return { success: false, need_password_setup: true };
    }

    if (!login.passwordHash) return { success: false, need_password_setup: true };

    const valid = await bcrypt.compare(password, login.passwordHash);
    if (!valid) throw new UnauthorizedException('Contraseña incorrecta.');

    login.lastLogin = new Date();
    await this.loginRepo.save(login);

    const token = await this.jwtService.signAsync({
      sub: codigoCliente,
      nombre: cliente.nombre,
      sector: cliente.sector,
    });

    return {
      success: true,
      accessToken: token,
      cliente: { codigo: cliente.codigo, nombre: cliente.nombre, sector: cliente.sector },
    };
  }

  async checkPasswordStatus(codigoCliente: string) {
    if (!codigoCliente?.trim()) throw new BadRequestException('Falta el código del cliente.');

    const cliente = await this.clientesRepo.findOne({
      where: { codigo: codigoCliente },
      select: ['codigo', 'tipo'],
    });

    if (!cliente) throw new NotFoundException('El código de cliente no existe.');

    if (cliente.tipo != 'ISY')
      throw new UnauthorizedException(`Cliente suspendido o inhabilitado.`);

    const login = await this.loginRepo.findOne({ where: { codigoCliente } });
    return { hasPassword: !!login?.passwordHash };
  }

async setPassword(codigoCliente: string, nuevaPassword: string, email: string) {
  if (!codigoCliente || !nuevaPassword || !email)
    throw new BadRequestException('Faltan datos para asignar la contraseña o el correo.');

  const cliente = await this.clientesRepo.findOne({ where: { codigo: codigoCliente } });
  if (!cliente) throw new NotFoundException('El código de cliente no existe en el ERP.');

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email))
    throw new BadRequestException('El formato del correo electrónico no es válido.');

  const hash = await bcrypt.hash(nuevaPassword, 10);

  let registro = await this.loginRepo.findOne({ where: { codigoCliente } });
  if (!registro) registro = this.loginRepo.create({ codigoCliente });

  registro.passwordHash = hash;
  registro.email = email.trim().toLowerCase();
  registro.firstLogin = 0;
  registro.lastLogin = new Date();
  await this.loginRepo.save(registro);

  cliente.wwwcli = email.trim().toLowerCase();
  await this.clientesRepo.save(cliente);

  return { message: 'Contraseña y correo guardados correctamente.' };
}

async sendPasswordResetEmail(codigoCliente: string) {
  if (!codigoCliente?.trim())
    throw new BadRequestException('Debe ingresar el código de cliente.');

  const cliente = await this.clientesRepo.findOne({ 
    where: { codigo: codigoCliente },
    select: ['codigo', 'nombre', 'wwwcli'],  // Cambiar email por wwwcli
  });

  if (!cliente || !cliente.wwwcli?.trim())
    throw new NotFoundException('No se encontró un cliente con ese código o sin correo asignado.');

  try {
    const token = this.jwtService.sign(
      { sub: codigoCliente },
      { expiresIn: '15m', secret: process.env.JWT_SECRET },
    );

    const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;

    await this.mailerService.sendMail({
      to: cliente.wwwcli.trim(),  // Cambiar a wwwcli
      subject: 'Restablecer contraseña - i.SYNC',
      from: `"i.SYNC noreply" <${process.env.NOTIFICATION_EMAIL}>`,  // Usar variable de entorno
      html: `
        <p>Hola <b>${cliente.nombre}</b>,</p>
        <p>Recibimos una solicitud para restablecer tu contraseña.</p>
        <p>Haz clic en el siguiente enlace para crear una nueva contraseña:</p>
        <p><a href="${resetLink}" target="_blank">Restablecer mi contraseña</a></p>
        <p>⚠️ Este enlace expirará en 15 minutos.</p>
      `,
    });

    return { message: 'Se ha enviado un enlace de recuperación al correo registrado.' };
  } catch (err) {
    this.logger.error(`Error enviando email: ${err.message}`);
    throw new InternalServerErrorException('No se pudo enviar el correo.');
  }
}

  async verifyResetToken(token: string) {
    try {
      const decoded = await this.jwtService.verifyAsync(token, {
        secret: process.env.JWT_SECRET,
      });
      return { valid: true, codigoCliente: decoded.sub };
    } catch {
      return { valid: false };
    }
  }

  async resetPassword(token: string, newPassword: string) {
    let codigoCliente: string;

    try {
      const decoded = await this.jwtService.verifyAsync(token, {
        secret: process.env.JWT_SECRET,
      });
      codigoCliente = decoded.sub;
    } catch {
      throw new UnauthorizedException('El enlace de recuperación ha expirado o no es válido.');
    }

    const cliente = await this.clientesRepo.findOne({ where: { codigo: codigoCliente } });
    if (!cliente) throw new NotFoundException('Cliente no encontrado.');

    const hash = await bcrypt.hash(newPassword, 10);

    let registro = await this.loginRepo.findOne({ where: { codigoCliente } });
    if (!registro) registro = this.loginRepo.create({ codigoCliente });

    registro.passwordHash = hash;
    registro.firstLogin = 0;
    registro.lastLogin = new Date();
    await this.loginRepo.save(registro);

    return { message: 'Tu contraseña ha sido restablecida correctamente.' };
  }
}
