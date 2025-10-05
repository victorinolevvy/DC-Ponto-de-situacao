import {
  Body,
  Controller,
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
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Perfil } from '@prisma/client';
import { ProjetosService } from './projetos.service';
import { CreateProjetoDto } from './dto/create-projeto.dto';
import { UpdateProjetoDto } from './dto/update-projeto.dto';
import { FilterProjetoDto } from './dto/filter-projeto.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('Projetos')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('projetos')
export class ProjetosController {
  constructor(private readonly projetosService: ProjetosService) {}

  @Get()
  listar(@Query() filtro: FilterProjetoDto) {
    return this.projetosService.listar(filtro);
  }

  @Get(':id/resumo')
  @ApiOperation({ summary: 'Obter resumo do projeto' })
  @ApiOkResponse({
    description:
      'Resumo consolidado do projeto com cálculo do semáforo definitivo e motivos associados.',
    schema: {
      example: {
        success: true,
        data: {
          totalContratos: 3,
          valorTotalContratoMT: 96000000,
          statusSemaforo: 'amarelo',
          motivosSemaforo: [
            'risco_em_monitorizacao',
            'prazo_contrato_ate_15dias',
          ],
          proximasDatasChave: [
            {
              id: 5,
              tipo: 'Vistoria',
              data: '2024-07-18T00:00:00.000Z',
              nota: 'Vistoria técnica parcial',
            },
          ],
        },
      },
    },
  })
  resumo(@Param('id', ParseIntPipe) id: number) {
    return this.projetosService.obterResumo(id);
  }

  @Get(':id')
  obter(@Param('id', ParseIntPipe) id: number) {
    return this.projetosService.obter(id);
  }

  @Post()
  @Roles(Perfil.Admin, Perfil.Gestor)
  criar(@Body() dto: CreateProjetoDto) {
    return this.projetosService.criar(dto);
  }

  @Patch(':id')
  @Roles(Perfil.Admin, Perfil.Gestor)
  actualizar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateProjetoDto,
  ) {
    return this.projetosService.actualizar(id, dto);
  }
}
