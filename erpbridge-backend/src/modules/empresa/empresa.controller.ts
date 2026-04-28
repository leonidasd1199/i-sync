import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { EmpresaService } from './empresa.service';
import { Empresa } from './empresa.entity';

@ApiTags('Empresas')
@Controller('empresas')
export class EmpresaController {
  constructor(private readonly empresaService: EmpresaService) {}

  /**
   * GET /api/empresas
   * Returns all registered companies in PSKLOUD.
   */
  @Get()
  @ApiOperation({ summary: 'Retrieve all companies registered in PSKLOUD' })
  @ApiResponse({ status: 200, type: [Empresa] })
  async findAll(): Promise<Empresa[]> {
    return this.empresaService.findAll();
  }

  /**
   * GET /api/empresas/:id
   * Returns a specific company by its ID.
   */
  @Get(':id')
  @ApiOperation({ summary: 'Retrieve a specific company by ID' })
  @ApiResponse({ status: 200, type: Empresa })
  async findOne(@Param('id') id: string): Promise<Empresa | null> {
    return this.empresaService.findById(id);
  }
}
