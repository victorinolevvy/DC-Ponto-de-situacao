import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { Perfil } from '@prisma/client';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RelatoriosService } from './relatorios.service';
import { CreateRelatorioDto } from './dto/create-relatorio.dto';
import {
  ListRelatorioQueryDto,
  EvolucaoQueryDto,
} from './dto/list-relatorio.query';
import { UpdateRelatorioDto } from './dto/update-relatorio.dto';

interface CurrentUserPayload {
  id: number;
  email: string;
  perfil: Perfil;
}

@ApiTags('Relatórios Quinzenais')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class RelatoriosController {
  constructor(private readonly relatoriosService: RelatoriosService) {}

  @Post('projetos/:projetoId/relatorios')
  @Roles(Perfil.Admin, Perfil.Gestor)
  @Throttle(10, 60)
  @ApiOperation({
    summary: 'Registar um novo relatório quinzenal para o projeto.',
    description:
      'Cria uma nova versão do relatório mantendo o histórico. Validações incluem limites de percentagem e data de referência (máx. 3 dias no futuro).',
  })
  @ApiBody({
    type: CreateRelatorioDto,
    examples: {
      default: {
        summary: 'Relatório geral do projeto',
        value: {
          dataRef: '2024-03-15',
          execFisicaPct: 42.5,
          execFinanceiraPct: 45.1,
          prazo: 'NO_PRAZO',
          risco: 'Risco de atraso na entrega de painéis.',
          mitigacao: 'Fornecedor alternativo contactado.',
        },
      },
    },
  })
  @ApiOkResponse({
    description: 'Relatório criado com sucesso.',
    schema: {
      example: {
        success: true,
        data: {
          id: 14,
          projetoId: 1,
          dataRef: '2024-03-15T00:00:00.000Z',
          execFisicaPct: '42.50',
          execFinanceiraPct: '45.10',
          prazo: 'NO_PRAZO',
          risco: 'Risco de atraso na entrega de painéis.',
          mitigacao: 'Fornecedor alternativo contactado.',
          autorUserId: 3,
          createdAt: '2024-03-16T08:00:00.000Z',
          updatedAt: '2024-03-16T08:00:00.000Z',
        },
      },
    },
  })
  criar(
    @Param('projetoId', ParseIntPipe) projetoId: number,
    @Body() dto: CreateRelatorioDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.relatoriosService.criar(projetoId, dto, user);
  }

  @Get('projetos/:projetoId/relatorios')
  @ApiOperation({
    summary: 'Listar relatórios quinzenais do projeto.',
    description:
      'Permite filtros por intervalo de datas, contrato e ordenação. A paginação devolve metadados de total de registos.',
  })
  @ApiQuery({ name: 'from', required: false, type: String })
  @ApiQuery({ name: 'to', required: false, type: String })
  @ApiQuery({ name: 'contratoId', required: false, type: Number })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'pageSize', required: false, type: Number, example: 10 })
  @ApiQuery({
    name: 'sort',
    required: false,
    type: String,
    example: 'dataRef:desc',
    description:
      'Formato campo:direcção. Actualmente apenas `dataRef` é suportado.',
  })
  @ApiOkResponse({
    description: 'Lista paginada de relatórios do projeto.',
    schema: {
      example: {
        success: true,
        data: {
          items: [
            {
              id: 12,
              projetoId: 1,
              dataRef: '2024-03-15T00:00:00.000Z',
              execFisicaPct: '42.50',
              execFinanceiraPct: '45.10',
              prazo: 'NO_PRAZO',
              risco: 'Risco de atraso na entrega de painéis.',
              mitigacao: 'Fornecedor alternativo contactado.',
              autorUserId: 3,
              createdAt: '2024-03-16T08:00:00.000Z',
              updatedAt: '2024-03-16T08:00:00.000Z',
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
  })
  listar(
    @Param('projetoId', ParseIntPipe) projetoId: number,
    @Query() query: ListRelatorioQueryDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.relatoriosService.listar(projetoId, query, user);
  }

  @Get('relatorios/:id')
  @ApiOperation({ summary: 'Obter detalhe de um relatório quinzenal.' })
  @ApiOkResponse({
    description: 'Detalhe do relatório solicitado.',
    schema: {
      example: {
        success: true,
        data: {
          id: 12,
          projetoId: 1,
          contratoId: 3,
          dataRef: '2024-03-15T00:00:00.000Z',
          execFisicaPct: '42.50',
          execFinanceiraPct: '45.10',
          prazo: 'NO_PRAZO',
          risco: 'Risco de atraso na entrega de painéis.',
          mitigacao: 'Fornecedor alternativo contactado.',
          autorUserId: 3,
          createdAt: '2024-03-16T08:00:00.000Z',
          updatedAt: '2024-03-16T08:00:00.000Z',
        },
      },
    },
  })
  detalhe(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.relatoriosService.obterDetalhe(id, user);
  }

  @Patch('relatorios/:id')
  @Roles(Perfil.Admin, Perfil.Gestor)
  @Throttle(10, 60)
  @ApiOperation({
    summary: 'Actualizar um relatório quinzenal.',
    description:
      'Permite corrigir valores mantendo histórico de versões através do campo `updatedAt`. Apenas o autor (ou administradores) podem editar.',
  })
  @ApiOkResponse({
    description: 'Relatório actualizado com sucesso.',
    schema: {
      example: {
        success: true,
        data: {
          id: 12,
          projetoId: 1,
          dataRef: '2024-03-15T00:00:00.000Z',
          execFisicaPct: '44.00',
          execFinanceiraPct: '45.10',
          prazo: 'NO_PRAZO',
          risco: 'Risco mitigado.',
          mitigacao: 'Fornecedor alternativo em execução.',
          autorUserId: 3,
          createdAt: '2024-03-16T08:00:00.000Z',
          updatedAt: '2024-03-20T09:10:00.000Z',
        },
      },
    },
  })
  actualizar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateRelatorioDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.relatoriosService.actualizar(id, dto, user);
  }

  @Delete('relatorios/:id')
  @Roles(Perfil.Admin)
  @Throttle(5, 60)
  @ApiOperation({ summary: 'Remover (soft-delete) um relatório quinzenal.' })
  @ApiOkResponse({
    description: 'Relatório marcado como removido.',
    schema: { example: { success: true } },
  })
  remover(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.relatoriosService.remover(id, user);
  }

  @Get('projetos/:projetoId/evolucao')
  @ApiOperation({
    summary: 'Obter série temporal de evolução física/financeira.',
    description:
      'Retorna pares data/valor ordenados para alimentar gráficos de tendência. Pode ser filtrado por contrato e métrica (física ou financeira).',
  })
  @ApiOkResponse({
    description: 'Série temporal do projeto.',
    schema: {
      example: {
        success: true,
        data: [
          { id: 10, dataRef: '2024-01-31T00:00:00.000Z', valor: 25.3 },
          { id: 12, dataRef: '2024-02-15T00:00:00.000Z', valor: 32.1 },
        ],
      },
    },
  })
  evolucao(
    @Param('projetoId', ParseIntPipe) projetoId: number,
    @Query() query: EvolucaoQueryDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.relatoriosService.obterEvolucao(projetoId, query, user);
  }

  @Get('projetos/:projetoId/ultima-quinzena')
  @ApiOperation({
    summary:
      'Consultar o último relatório e variação versus quinzena anterior.',
    description:
      'Útil para KPIs do dashboard, inclui o delta de execução física e financeira entre as duas últimas submissões.',
  })
  @ApiOkResponse({
    description: 'Último relatório e deltas calculados.',
    schema: {
      example: {
        success: true,
        data: {
          ultimoRelatorio: {
            id: 12,
            projetoId: 1,
            dataRef: '2024-03-30T00:00:00.000Z',
            execFisicaPct: '55.00',
            execFinanceiraPct: '58.00',
            prazo: 'NO_PRAZO',
            risco: null,
            mitigacao: null,
            autorUserId: 3,
            createdAt: '2024-03-31T10:00:00.000Z',
            updatedAt: '2024-03-31T10:00:00.000Z',
          },
          anteriorRelatorio: {
            id: 9,
            projetoId: 1,
            dataRef: '2024-03-15T00:00:00.000Z',
            execFisicaPct: '50.00',
            execFinanceiraPct: '54.00',
            prazo: 'NO_PRAZO',
            risco: 'Risco mitigado.',
            mitigacao: 'Accões em curso.',
            autorUserId: 3,
            createdAt: '2024-03-16T08:00:00.000Z',
            updatedAt: '2024-03-16T08:00:00.000Z',
          },
          deltas: {
            execFisicaPct: 5,
            execFinanceiraPct: 4,
          },
        },
      },
    },
  })
  ultimaQuinzena(
    @Param('projetoId', ParseIntPipe) projetoId: number,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.relatoriosService.obterUltimaQuinzena(projetoId, user);
  }
}
