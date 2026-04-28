import { PedidosService } from './pedidos.service';

function buildMocks() {
  const dataSource = { createQueryRunner: jest.fn() };
  const cache = { get: jest.fn(), set: jest.fn(), del: jest.fn() };
  const mailerService = { sendMail: jest.fn() };
  const carritoService = { clear: jest.fn() };

  const service = new PedidosService(
    dataSource as any,
    cache as any,
    mailerService as any,
    carritoService as any,
  );

  return { service, dataSource, cache, mailerService, carritoService };
}

describe('PedidosService', () => {
  afterEach(() => jest.clearAllMocks());

  describe('esErrorDeConexion (private)', () => {
    it('returns true for ECONNREFUSED', () => {
      const { service } = buildMocks();
      expect((service as any).esErrorDeConexion('connect ECONNREFUSED 127.0.0.1:3306')).toBe(true);
    });

    it('returns true for timeout errors', () => {
      const { service } = buildMocks();
      expect((service as any).esErrorDeConexion('Connection timeout')).toBe(true);
    });

    it('returns false for a regular business error', () => {
      const { service } = buildMocks();
      expect((service as any).esErrorDeConexion('Artículos no encontrados: ART-001')).toBe(false);
    });
  });

  describe('generateValidationId (private)', () => {
    it('returns a 12-character uppercase string', () => {
      const { service } = buildMocks();
      const id = (service as any).generateValidationId('seed');
      expect(id).toHaveLength(12);
      expect(id).toBe(id.toUpperCase());
    });

    it('is deterministic for the same seed', () => {
      const { service } = buildMocks();
      const a = (service as any).generateValidationId('same-seed');
      const b = (service as any).generateValidationId('same-seed');
      expect(a).toBe(b);
    });
  });

  describe('crearPedido', () => {
    it('returns an error when carrito is empty', async () => {
      const { service, dataSource } = buildMocks();

      const queryRunner = {
        connect: jest.fn(),
        startTransaction: jest.fn(),
        query: jest.fn()
          .mockResolvedValueOnce([{ nombre: 'Test Company' }])  // empresa
          .mockResolvedValueOnce([{ nombre: 'Test Client', tipoprecio: 1, formafis: 0, descuento: 0 }]), // cliente
        rollbackTransaction: jest.fn(),
        release: jest.fn(),
      };
      dataSource.createQueryRunner.mockReturnValue(queryRunner);

      const result = await service.crearPedido('001000', '001', {
        codCliente: 'C01',
        vendedor: 'V01',
        carrito: [],
      });

      expect(result.success).toBe(false);
    });
  });
});
