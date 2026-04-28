import { ArticulosService } from './articulo.service';

function buildMocks() {
  const articuloRepo = { find: jest.fn() };
  const existenciaRepo = { find: jest.fn() };
  const dataSource = { query: jest.fn().mockResolvedValue([]) };

  const service = new ArticulosService(
    articuloRepo as any,
    existenciaRepo as any,
    dataSource as any,
  );

  return { service, dataSource };
}

describe('ArticulosService', () => {
  afterEach(() => jest.clearAllMocks());

  describe('listarGruposYSubgrupos', () => {
    it('queries both grupos and subgrupos tables', async () => {
      const { service, dataSource } = buildMocks();
      dataSource.query
        .mockResolvedValueOnce([{ codigo: 'G1', nombre: 'Grupo 1' }])
        .mockResolvedValueOnce([]);

      await service.listarGruposYSubgrupos();

      expect(dataSource.query).toHaveBeenCalledTimes(2);
      const calls: string[] = (dataSource.query as jest.Mock).mock.calls.map(
        (c: any[]) => c[0],
      );
      expect(calls.some((q) => q.includes('grupos'))).toBe(true);
      expect(calls.some((q) => q.includes('subgrupos'))).toBe(true);
    });

    it('groups subgrupos by their parent grupo code', async () => {
      const { service, dataSource } = buildMocks();
      dataSource.query
        .mockResolvedValueOnce([{ codigo: 'G1', nombre: 'Grupo 1' }])
        .mockResolvedValueOnce([
          { grupoCodigo: 'G1', subcodigo: 'S1', nombre: 'Sub 1' },
          { grupoCodigo: 'G1', subcodigo: 'S2', nombre: 'Sub 2' },
        ]);

      const result = await service.listarGruposYSubgrupos();

      expect(result.subgruposPorGrupo['G1']).toHaveLength(2);
    });
  });

  describe('listarModelos', () => {
    it('queries modelos for a given empresa', async () => {
      const { service, dataSource } = buildMocks();
      dataSource.query.mockResolvedValue([{ modelo: 'ModeloA' }]);

      const result = await service.listarModelos('001000');

      expect(result).toEqual(['ModeloA']);
      expect(dataSource.query).toHaveBeenCalledWith(
        expect.stringContaining('modelo'),
        expect.arrayContaining(['001000']),
      );
    });

    it('appends a grupo filter when provided', async () => {
      const { service, dataSource } = buildMocks();
      dataSource.query.mockResolvedValue([]);

      await service.listarModelos('001000', 'FARMA');

      const [sql, params] = (dataSource.query as jest.Mock).mock.calls[0];
      expect(sql).toContain('grupo');
      expect(params).toContain('FARMA');
    });

    it('appends both grupo and subgrupo filters when provided', async () => {
      const { service, dataSource } = buildMocks();
      dataSource.query.mockResolvedValue([]);

      await service.listarModelos('001000', 'FARMA', 'ANTIBIOTICOS');

      const [sql, params] = (dataSource.query as jest.Mock).mock.calls[0];
      expect(sql).toContain('subgrupo');
      expect(params).toContain('ANTIBIOTICOS');
    });
  });
});
