import { Controller, Get, Query, Param } from '@nestjs/common';
import { ArticulosService } from './articulo.service';
import { ApiTags, ApiQuery, ApiOperation, ApiParam } from '@nestjs/swagger';

@ApiTags('Artículos')
@Controller('articulos')
export class ArticulosController {
  constructor(private readonly articulosService: ArticulosService) {}

  @Get('guest')
  @ApiOperation({ summary: 'Obtener lista pública de artículos (modo invitado)' })
  async listarArticulosGuest(
    @Query('page') page = 1,
    @Query('limit') limit = 50,
    @Query('q') q?: string,
  ) {
    return this.articulosService.listarArticulosGuestPaginated(+page, +limit, q);
  }

  @Get()
  @ApiOperation({ summary: 'Obtener lista completa de artículos (modo autenticado)' })
  @ApiQuery({ name: 'empresa', required: false, example: '001000' })
  @ApiQuery({ name: 'agencia', required: false, example: '001' })
  @ApiQuery({ name: 'codCliente', required: true, example: 'C0001' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 50 })
  @ApiQuery({
    name: 'q',
    required: false,
    description: 'Buscar por nombre, código, marca o modelo',
  })
  @ApiQuery({ name: 'grupo', required: false, description: 'Filtrar por grupo' })
  @ApiQuery({ name: 'subgrupo', required: false, description: 'Filtrar por subgrupo' })
  @ApiQuery({ name: 'modelo', required: false, description: 'Filtrar por modelo' })
  @ApiQuery({
    name: 'stock',
    required: false,
    description: 'Filtrar por disponibilidad: con-stock | sin-stock | todos',
  })
  async obtenerArticulos(
    @Query('empresa') empresa = '001000',
    @Query('agencia') agencia = '001',
    @Query('codCliente') codCliente: string,
    @Query('page') page = 1,
    @Query('limit') limit = 50,
    @Query('q') q?: string,
    @Query('grupo') grupo?: string,
    @Query('subgrupo') subgrupo?: string,
    @Query('modelo') modelo?: string,
    @Query('stock') stockFilter?: string,
  ) {
    return this.articulosService.listarArticulosPaginated(
      empresa,
      agencia,
      codCliente,
      Number(page),
      Number(limit),
      q,
      { grupo, subgrupo, modelo, stockFilter },
    );
  }

  @Get('totales')
  @ApiOperation({ summary: 'Obtener totales globales de artículos (total, con stock, sin stock)' })
  @ApiQuery({ name: 'empresa', required: false, example: '001000' })
  @ApiQuery({ name: 'agencia', required: false, example: '001' })
  async obtenerTotales(
    @Query('empresa') empresa = '001000',
    @Query('agencia') agencia = '001',
  ) {
    return this.articulosService.obtenerTotalesArticulos(empresa, agencia);
  }

  @Get('grupos-subgrupos')
  @ApiOperation({ summary: 'Obtener todos los grupos y subgrupos disponibles' })
  async obtenerGruposYSubgrupos() {
    return this.articulosService.listarGruposYSubgrupos();
  }

@Get('modelos')
@ApiOperation({ summary: 'Obtener modelos disponibles (opcionalmente filtrados por grupo/subgrupo)' })
@ApiQuery({ name: 'empresa', required: false, example: '001000' })
@ApiQuery({ name: 'grupo', required: false, description: 'Filtrar por grupo' })
@ApiQuery({ name: 'subgrupo', required: false, description: 'Filtrar por subgrupo' })
async obtenerModelos(
  @Query('empresa') empresa = '001000',
  @Query('grupo') grupo?: string,
  @Query('subgrupo') subgrupo?: string,
) {
  return this.articulosService.listarModelos(empresa, grupo, subgrupo);
}

@Get(':codigo')
@ApiOperation({ summary: 'Obtener artículo por código' })
async obtenerArticuloPorCodigo(
  @Query('empresa') empresa = '001000',
  @Query('agencia') agencia = '001',
  @Query('cliente') cliente = '',
  @Param('codigo') codigo: string,
) {
  return this.articulosService.obtenerArticuloPorCodigo(
    codigo,
    empresa,
    agencia,
    cliente || undefined,
  );
}
}
