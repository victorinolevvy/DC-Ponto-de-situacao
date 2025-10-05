import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
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
import { MarcosService } from './marcos.service';
import { CreateMarcoDto } from './dto/create-marco.dto';

@ApiTags('Marcos')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class MarcosController {
  constructor(private readonly marcosService: MarcosService) {}

  @Get('projetos/:projetoId/marcos')
  @ApiOperation({ summary: 'Listar marcos de um projeto' })
  @ApiOkResponse({
    description: 'Lista cronológica de marcos do projeto.',
    schema: {
      example: {
        success: true,
        data: [
          {
            id: 1,
            tipo: 'Consignacao',
            data: '2024-02-05T00:00:00.000Z',
            nota: 'Consignação assinada',
            projetoId: 1,
            createdAt: '2024-02-05T08:00:00.000Z',
            updatedAt: '2024-02-05T08:00:00.000Z',
          },
        ],
      },
    },
  })
  listar(@Param('projetoId', ParseIntPipe) projetoId: number) {
    return this.marcosService.listar(projetoId);
  }

  @Post('projetos/:projetoId/marcos')
  @Roles(Perfil.Admin, Perfil.Gestor)
  @ApiOperation({ summary: 'Criar marco para um projeto' })
  @ApiBody({
    type: CreateMarcoDto,
    examples: {
      default: {
        summary: 'Vistoria parcial',
        value: {
          tipo: 'Vistoria',
          data: '2024-08-22',
          nota: 'Vistoria intermédia',
        },
      },
    },
  })
  @ApiOkResponse({
    description: 'Marco criado com sucesso.',
    schema: {
      example: {
        success: true,
        data: {
          id: 12,
          tipo: 'Vistoria',
          data: '2024-08-22T00:00:00.000Z',
          nota: 'Vistoria intermédia',
          projetoId: 1,
          createdAt: '2024-04-01T10:00:00.000Z',
          updatedAt: '2024-04-01T10:00:00.000Z',
        },
      },
    },
  })
  criar(
    @Param('projetoId', ParseIntPipe) projetoId: number,
    @Body() dto: CreateMarcoDto,
  ) {
    return this.marcosService.criar(projetoId, dto);
  }
}
