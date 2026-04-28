import {
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { AuthService } from './auth.service';

function buildMocks() {
  const clientesRepo = {
    findOne: jest.fn(),
    save: jest.fn(),
  };
  const loginRepo = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };
  const jwtService = {
    signAsync: jest.fn().mockResolvedValue('mock-token'),
    sign: jest.fn().mockReturnValue('mock-token'),
    verifyAsync: jest.fn(),
  };
  const mailerService = {
    sendMail: jest.fn().mockResolvedValue(undefined),
  };

  const service = new AuthService(
    clientesRepo as any,
    loginRepo as any,
    jwtService as any,
    mailerService as any,
  );

  return { service, clientesRepo, loginRepo, jwtService, mailerService };
}

describe('AuthService', () => {
  afterEach(() => jest.clearAllMocks());

  describe('login', () => {
    it('returns need_password_setup when client has no password hash', async () => {
      const { service, clientesRepo, loginRepo } = buildMocks();

      clientesRepo.findOne.mockResolvedValue({ codigo: 'C01', nombre: 'Test', tipo: 'ISY' });
      loginRepo.findOne.mockResolvedValue({ codigoCliente: 'C01', passwordHash: null });

      const result = await service.login({ codigoCliente: 'C01', password: 'any' });

      expect(result).toEqual({ success: false, need_password_setup: true });
    });

    it('throws UnauthorizedException when password is wrong', async () => {
      const { service, clientesRepo, loginRepo } = buildMocks();
      const hash = await bcrypt.hash('correct', 10);

      clientesRepo.findOne.mockResolvedValue({ codigo: 'C01', nombre: 'Test', tipo: 'ISY' });
      loginRepo.findOne.mockResolvedValue({ codigoCliente: 'C01', passwordHash: hash });

      await expect(
        service.login({ codigoCliente: 'C01', password: 'wrong' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('returns access token on successful login', async () => {
      const { service, clientesRepo, loginRepo } = buildMocks();
      const hash = await bcrypt.hash('correct', 10);

      clientesRepo.findOne.mockResolvedValue({
        codigo: 'C01',
        nombre: 'Test Client',
        sector: '1',
        tipo: 'ISY',
      });
      loginRepo.findOne.mockResolvedValue({ codigoCliente: 'C01', passwordHash: hash });
      loginRepo.save.mockResolvedValue(undefined);

      const result = await service.login({ codigoCliente: 'C01', password: 'correct' });

      expect(result).toMatchObject({ success: true, accessToken: 'mock-token' });
    });

    it('throws NotFoundException when client does not exist', async () => {
      const { service, clientesRepo } = buildMocks();
      clientesRepo.findOne.mockResolvedValue(null);

      await expect(
        service.login({ codigoCliente: 'UNKNOWN', password: 'any' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws UnauthorizedException for suspended client', async () => {
      const { service, clientesRepo } = buildMocks();
      clientesRepo.findOne.mockResolvedValue({ codigo: 'C01', tipo: 'INACTIVO' });

      await expect(
        service.login({ codigoCliente: 'C01', password: 'any' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('checkPasswordStatus', () => {
    it('returns hasPassword false when no login record exists', async () => {
      const { service, clientesRepo, loginRepo } = buildMocks();
      clientesRepo.findOne.mockResolvedValue({ codigo: 'C01', tipo: 'ISY' });
      loginRepo.findOne.mockResolvedValue(null);

      const result = await service.checkPasswordStatus('C01');
      expect(result).toEqual({ hasPassword: false });
    });

    it('returns hasPassword true when a password hash is present', async () => {
      const { service, clientesRepo, loginRepo } = buildMocks();
      clientesRepo.findOne.mockResolvedValue({ codigo: 'C01', tipo: 'ISY' });
      loginRepo.findOne.mockResolvedValue({ passwordHash: 'some-hash' });

      const result = await service.checkPasswordStatus('C01');
      expect(result).toEqual({ hasPassword: true });
    });
  });

  describe('setPassword', () => {
    it('throws BadRequestException for an invalid email format', async () => {
      const { service, clientesRepo } = buildMocks();
      clientesRepo.findOne.mockResolvedValue({ codigo: 'C01' });

      await expect(
        service.setPassword('C01', 'password123', 'not-an-email'),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
