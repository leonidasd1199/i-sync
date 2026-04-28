import { Controller, Get, Param } from '@nestjs/common';
import { AgenciasService } from './agencias.service';
import { ApiTags, ApiParam, ApiOperation, ApiResponse } from '@nestjs/swagger';

/**
 * AgenciasController:
 * Exposes endpoints for the "agencias" table.
 */
@ApiTags('Agencias')
@Controller('agencias')
export class AgenciasController {
  constructor(private readonly agenciasService: AgenciasService) {}

  /**
   * GET /api/agencias
   * Retrieve all agencies registered in PSKLOUD.
   */
  @Get()
  @ApiOperation({ summary: 'Retrieve all agencies' })
  @ApiResponse({ status: 200, description: 'List of all agencies' })
  async getAll() {
    return this.agenciasService.findAll();
  }

  @Get('empresa/:idEmpresa')
  @ApiOperation({ summary: 'Retrieve agencies by company ID' })
  @ApiParam({ name: 'idEmpresa', description: 'Company ID', example: '001000' })
  @ApiResponse({ status: 200, description: 'List of agencies belonging to the specified company' })
  async getByEmpresa(@Param('idEmpresa') idEmpresa: string) {
    return this.agenciasService.findByEmpresa(idEmpresa);
  }

  @Get(':agencia')
  @ApiOperation({ summary: 'Retrieve a specific agency by code' })
  @ApiParam({ name: 'agencia', description: 'Agency code', example: '001' })
  @ApiResponse({ status: 200, description: 'Agency information' })
  async getByAgencia(@Param('agencia') agencia: string) {
    return this.agenciasService.findByAgencia(agencia);
  }
}
