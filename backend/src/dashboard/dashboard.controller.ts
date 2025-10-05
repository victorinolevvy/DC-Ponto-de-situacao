import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { Perfil } from '@prisma/client';
import { Throttle } from '@nestjs/throttler';
import { DashboardService } from './dashboard.service';
import type { OverviewResponse } from './dashboard.service';
import {
  DashboardExportQueryDto,
  DashboardOverviewQueryDto,
} from './dto/dashboard-overview-query.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('Dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('overview')
  @Roles(Perfil.Admin, Perfil.Director, Perfil.Gestor)
  @ApiOperation({
    summary: 'Obter indicadores consolidados e lista filtrável de projetos.',
    description:
      'Retorna KPIs globais, lista consolidada de projetos com filtros por província, tipo e estado e ordenação dinâmica. A lista inclui o semáforo definitivo calculado a partir de relatórios recentes.',
  })
  @ApiQuery({ name: 'provinciaId', required: false, type: Number })
  @ApiQuery({
    name: 'tipoProjeto',
    required: false,
    enum: ['FV', 'Hidrica', 'MiniRede', 'Outro'],
  })
  @ApiQuery({
    name: 'estado',
    required: false,
    enum: ['EmCurso', 'Concluido', 'Parado'],
  })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'pageSize', required: false, type: Number, example: 10 })
  @ApiQuery({
    name: 'sortBy',
    required: false,
    enum: [
      'nome',
      'execFisicaPct',
      'execFinanceiraPct',
      'prazo',
      'valorTotalContratos',
      'ultimaAtualizacao',
      'statusSemaforo',
    ],
  })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['asc', 'desc'] })
  @ApiOkResponse({
    description: 'KPIs globais e lista consolidada de projetos.',
    schema: {
      example: {
        success: true,
        data: {
          kpis: {
            totalEmCurso: 2,
            totalConcluido: 1,
            totalParado: 1,
            valorTotalInvestimentoMT: 360000000,
            mediaExecucaoFisica: 48.5,
            riscosAtivos: 2,
          },
          lista: {
            items: [
              {
                id: 1,
                nome: 'Divinhe - FV',
                provincia: 'Maputo',
                tipoProjeto: 'FV',
                estado: 'EmCurso',
                execFisicaPct: 44.8,
                execFinanceiraPct: 46.1,
                prazo: 'NO_PRAZO',
                valorTotalContratos: 75000000,
                statusSemaforo: 'amarelo',
                riscoCurto: 'Observado atraso na entrega de cabos.',
                ultimaAtualizacao: '2024-03-30T00:00:00.000Z',
                latitude: -26.4621,
                longitude: 32.1723,
                motivosSemaforo: ['risco_em_monitorizacao'],
              },
            ],
            meta: {
              total: 4,
              page: 1,
              pageSize: 10,
              totalPages: 1,
            },
          },
        },
      },
    },
  })
  overview(
    @Query() query: DashboardOverviewQueryDto,
  ): Promise<OverviewResponse> {
    return this.dashboardService.getOverview(query);
  }

  @Get('overview/export')
  @Roles(Perfil.Admin, Perfil.Director, Perfil.Gestor)
  @Throttle({
    default: { limit: 5, ttl: 60 },
  })
  @ApiOperation({
    summary: 'Exportar a tabela consolidada filtrada para Excel ou PDF.',
    description:
      'Gera um ficheiro Excel (.xlsx) ou PDF com a lista de projetos segundo os filtros aplicados no dashboard.',
  })
  @ApiQuery({ name: 'format', required: true, enum: ['xlsx', 'pdf'] })
  @ApiQuery({ name: 'provinciaId', required: false, type: Number })
  @ApiQuery({
    name: 'tipoProjeto',
    required: false,
    enum: ['FV', 'Hidrica', 'MiniRede', 'Outro'],
  })
  @ApiQuery({
    name: 'estado',
    required: false,
    enum: ['EmCurso', 'Concluido', 'Parado'],
  })
  @ApiQuery({
    name: 'sortBy',
    required: false,
    enum: [
      'nome',
      'execFisicaPct',
      'execFinanceiraPct',
      'prazo',
      'valorTotalContratos',
      'ultimaAtualizacao',
      'statusSemaforo',
    ],
  })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['asc', 'desc'] })
  @ApiOkResponse({
    description: 'Ficheiro binário com o resultado da exportação.',
    schema: { type: 'string', format: 'binary' },
  })
  export(@Query() query: DashboardExportQueryDto) {
    return this.dashboardService.exportOverview(query);
  }
}
