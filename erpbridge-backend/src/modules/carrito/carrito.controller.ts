import { Controller, Get, Post, Delete, Body, Param, Query, Req, UseGuards, BadRequestException, ForbiddenException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Request } from 'express';
import { CarritoService } from './carrito.service';

@UseGuards(AuthGuard('jwt'))
@Controller('carrito')
export class CarritoController {
  constructor(private readonly service: CarritoService) {}

  // GET /carrito/version/:cliente  — lightweight poll, returns only { version }
  @Get('version/:cliente')
  getVersion(@Req() req: Request, @Param('cliente') cliente: string) {
    if (!cliente?.trim()) throw new BadRequestException('Código de cliente es requerido.');
    if ((req.user as any).sub !== cliente) throw new ForbiddenException();
    return this.service.getVersion(cliente);
  }

  // GET /carrito/:cliente?empresa=001000&agencia=001  — full cart enriched from ERP
  @Get(':cliente')
  getCart(
    @Req() req: Request,
    @Param('cliente') cliente: string,
    @Query('empresa') empresa = '001000',
    @Query('agencia') agencia = '001',
  ) {
    if (!cliente?.trim()) throw new BadRequestException('Código de cliente es requerido.');
    if ((req.user as any).sub !== cliente) throw new ForbiddenException();
    return this.service.getUserCart(cliente, empresa, agencia);
  }

  // POST /carrito/item  — add or update one item  { cliente, codigo, cantidad }
  @Post('item')
  addOrUpdateItem(@Req() req: Request, @Body() body: { cliente?: string; codigo?: string; cantidad?: number }) {
    const { cliente, codigo, cantidad } = body;
    if (!cliente?.trim()) throw new BadRequestException('Falta: cliente');
    if (!codigo?.trim())  throw new BadRequestException('Falta: codigo');
    if ((req.user as any).sub !== cliente) throw new ForbiddenException();
    const qty = Number(cantidad);
    if (!qty || qty < 1)  throw new BadRequestException('cantidad debe ser >= 1');
    return this.service.addOrUpdateItem(cliente, codigo, qty);
  }

  // DELETE /carrito/item/:cliente/:codigo  — remove one item
  @Delete('item/:cliente/:codigo')
  removeItem(
    @Req() req: Request,
    @Param('cliente') cliente: string,
    @Param('codigo')  codigo: string,
  ) {
    if (!cliente?.trim()) throw new BadRequestException('Código de cliente es requerido.');
    if (!codigo?.trim())  throw new BadRequestException('Código de artículo es requerido.');
    if ((req.user as any).sub !== cliente) throw new ForbiddenException();
    return this.service.removeItem(cliente, codigo);
  }

  // DELETE /carrito/:cliente  — clear entire cart
  @Delete(':cliente')
  clear(@Req() req: Request, @Param('cliente') cliente: string) {
    if (!cliente?.trim()) throw new BadRequestException('Código de cliente es requerido.');
    if ((req.user as any).sub !== cliente) throw new ForbiddenException();
    return this.service.clear(cliente);
  }
}