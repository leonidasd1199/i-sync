import { CarritoService } from './carrito.service';
import { DataSource } from 'typeorm';

function buildMockDs() {
  const ds = {
    query: jest.fn().mockResolvedValue([]),
  } as unknown as DataSource;
  return ds;
}

describe('CarritoService', () => {
  let ds: DataSource;
  let service: CarritoService;

  beforeEach(() => {
    ds = buildMockDs();
    service = new CarritoService(ds);
    jest.spyOn(service, 'ensureTable').mockResolvedValue();
  });

  afterEach(() => jest.clearAllMocks());

  describe('addOrUpdateItem', () => {
    it('upserts into carrito_relacion and bumps version', async () => {
      const before = Date.now();
      const result = await service.addOrUpdateItem('CLI01', 'ART-001', 3);
      const after = Date.now();

      expect(result.success).toBe(true);
      expect(result.version).toBeGreaterThanOrEqual(before);
      expect(result.version).toBeLessThanOrEqual(after);

      const calls: string[] = (ds.query as jest.Mock).mock.calls.map((c: any[]) =>
        c[0].replace(/\s+/g, ' ').trim(),
      );
      expect(calls.some(q => q.includes('carrito_relacion'))).toBe(true);
      expect(calls.some(q => q.includes('carrito_version'))).toBe(true);
    });
  });

  describe('removeItem', () => {
    it('deletes from carrito_relacion and bumps version', async () => {
      const result = await service.removeItem('CLI01', 'ART-001');

      expect(result.success).toBe(true);
      expect(typeof result.version).toBe('number');

      const calls: string[] = (ds.query as jest.Mock).mock.calls.map((c: any[]) =>
        c[0].replace(/\s+/g, ' ').trim(),
      );
      expect(calls.some(q => q.includes('DELETE FROM carrito_relacion'))).toBe(true);
    });
  });

  describe('clear', () => {
    it('deletes all items for client and bumps version', async () => {
      const result = await service.clear('CLI01');

      expect(result.success).toBe(true);
      expect(typeof result.version).toBe('number');

      const calls: string[] = (ds.query as jest.Mock).mock.calls.map((c: any[]) =>
        c[0].replace(/\s+/g, ' ').trim(),
      );
      expect(calls.some(q => q.includes('DELETE FROM carrito_relacion'))).toBe(true);
      expect(calls.some(q => q.includes('carrito_version'))).toBe(true);
    });
  });

  describe('getVersion', () => {
    it('returns 0 when no version row exists', async () => {
      (ds.query as jest.Mock).mockResolvedValue([]);
      const result = await service.getVersion('CLI01');
      expect(result.version).toBe(0);
    });

    it('returns the stored version number', async () => {
      (ds.query as jest.Mock).mockResolvedValueOnce([{ version: 1700000000000 }]);
      const result = await service.getVersion('CLI01');
      expect(result.version).toBe(1700000000000);
    });
  });
});
