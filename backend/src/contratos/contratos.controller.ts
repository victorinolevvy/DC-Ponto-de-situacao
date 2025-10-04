import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Perfil } from '@prisma/client';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { ContratosService } from './contratos.service';
import { CreateContratoDto } from './dto/create-contrato.dto';
import { UpdateContratoDto } from './dto/update-contrato.dto';

@ApiTags('Contratos')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class ContratosController {
  constructor(private readonly contratosService: ContratosService) {}

  @Get('projetos/:projetoId/contratos')
  @ApiOperation({ summary: 'Listar contratos de um projeto' })
  @ApiOkResponse({
    description: 'Lista de contratos associados ao projeto.',
    schema: {
      example: {
        success: true,
        data: [
          {
            id: 1,
            tipoContrato: 'Civil',
            empresa: 'Construtora Atlântico',
            valorContratoMT: '45000000',
            dataInicio: '2024-02-01T00:00:00.000Z',
            dataPrevistaFim: '2024-12-15T00:00:00.000Z',
            chaveNaMao: true,
            projetoId: 1,
            createdAt: '2024-02-01T10:00:00.000Z',
            updatedAt: '2024-02-01T10:00:00.000Z',
          },
        ],
      },
    },
  })
  listar(@Param('projetoId', ParseIntPipe) projetoId: number) {
    return this.contratosService.listar(projetoId);
  }

  @Post('projetos/:projetoId/contratos')
  @Roles(Perfil.Admin, Perfil.Gestor)
  @ApiOperation({ summary: 'Criar contrato para um projeto' })
  @ApiBody({
    type: CreateContratoDto,
    examples: {
      default: {
        summary: 'Contrato Civil',
        value: {
          tipoContrato: 'Civil',
          empresa: 'Construtora Atlântico',
          valorContratoMT: 45000000,
          dataInicio: '2024-02-01',
          dataPrevistaFim: '2024-12-15',
          chaveNaMao: true,
        },
      },
    },
  })
  @ApiOkResponse({
    description: 'Contrato criado com sucesso.',
    schema: {
      example: {
        success: true,
        data: {
          id: 10,
          tipoContrato: 'Civil',
          empresa: 'Construtora Atlântico',
          valorContratoMT: '45000000',
          dataInicio: '2024-02-01T00:00:00.000Z',
          dataPrevistaFim: '2024-12-15T00:00:00.000Z',
          chaveNaMao: true,
          projetoId: 1,
          createdAt: '2024-02-01T10:00:00.000Z',
          updatedAt: '2024-02-01T10:00:00.000Z',
        },
      },
    },
  })
  criar(
    @Param('projetoId', ParseIntPipe) projetoId: number,
    @Body() dto: CreateContratoDto,
  ) {
    return this.contratosService.criar(projetoId, dto);
  }

  @Patch('contratos/:id')
  @Roles(Perfil.Admin, Perfil.Gestor)
  @ApiOperation({ summary: 'Actualizar contrato existente' })
  @ApiBody({ type: UpdateContratoDto })
  @ApiOkResponse({
    description: 'Contrato actualizado com sucesso.',
    schema: {
      example: {
        success: true,
        data: {
          id: 10,
          tipoContrato: 'Civil',
          empresa: 'Construtora Atlântico',
          valorContratoMT: '45500000',
          dataInicio: '2024-02-01T00:00:00.000Z',
          dataPrevistaFim: '2024-12-20T00:00:00.000Z',
          chaveNaMao: true,
          projetoId: 1,
          createdAt: '2024-02-01T10:00:00.000Z',
          updatedAt: '2024-03-01T10:00:00.000Z',
        },
      },
    },
  })
  actualizar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateContratoDto,
  ) {
    return this.contratosService.actualizar(id, dto);
  }
}
