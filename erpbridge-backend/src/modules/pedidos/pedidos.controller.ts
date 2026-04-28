import { Controller, Post, Get, Param, Body, Query, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiParam } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { PedidosService } from './pedidos.service';

@ApiTags('Pedidos')
@Controller('pedidos')
@UseGuards(AuthGuard('jwt'))
export class PedidosController {
  constructor(private readonly pedidosService: PedidosService) {}

  @Post()
  @ApiOperation({ summary: 'Crear un nuevo pedido' })
  async crearPedido(
    @Req() req,
    @Query('empresa') empresa = '001000',
    @Query('agencia') agencia = '001',
    @Body() body: {
      vendedor: string;
      notas?: string;
      carrito: { codigo: string; cantidad: number }[];
    },
  ) {
    return this.pedidosService.crearPedido(empresa, agencia, {
      ...body,
      codCliente: req.user.sub,
    });
  }

  @Get('paginated')
  @ApiOperation({ summary: 'Listar pedidos del cliente logueado con paginación' })
  @ApiQuery({ name: 'empresa', required: false, example: '001000' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 50 })
  @ApiQuery({ name: 'q', required: false, example: '006I2026' })
  async listarPedidosPaginated(
    @Req() req,
    @Query('empresa') empresa = '001000',
    @Query('page') page = 1,
    @Query('limit') limit = 50,
    @Query('q') q?: string,
  ) {
    return this.pedidosService.listarPedidosPaginated(
      empresa,
      req.user.sub,
      +page,
      +limit,
      q,
    );
  }

  @Get('totales')
  @ApiOperation({ summary: 'Totales del cliente logueado para dashboard' })
  @ApiQuery({ name: 'empresa', required: false, example: '001000' })
  async obtenerTotalesDashboard(
    @Req() req,
    @Query('empresa') empresa = '001000',
  ) {
    return this.pedidosService.obtenerTotalesDashboard(empresa, req.user.sub);
  }

  @Get(':documento')
  @ApiOperation({ summary: 'Detalle de un pedido del cliente logueado' })
  @ApiParam({ name: 'documento', example: '00000023' })
  @ApiQuery({ name: 'empresa', required: false, example: '001000' })
  async obtenerDetalle(
    @Req() req,
    @Param('documento') documento: string,
    @Query('empresa') empresa = '001000',
  ) {
    return this.pedidosService.obtenerDetallePedido(empresa, documento, req.user.sub);
  }
}
