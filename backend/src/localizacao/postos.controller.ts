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
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Perfil } from '@prisma/client';
import { LocalizacaoService } from './localizacao.service';
import { CreatePostoDto } from './dto/create-posto.dto';
import { UpdatePostoDto } from './dto/update-posto.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('Postos Administrativos')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('postos')
export class PostosController {
  constructor(private readonly localizacaoService: LocalizacaoService) {}

  @Get()
  @ApiQuery({ name: 'distritoId', required: false, type: Number })
  listar(@Query('distritoId') distritoId?: number) {
    return this.localizacaoService.listarPostos(
      distritoId ? Number(distritoId) : undefined,
    );
  }

  @Post()
  @Roles(Perfil.Admin)
  criar(@Body() dto: CreatePostoDto) {
    return this.localizacaoService.criarPosto(dto);
  }

  @Patch(':id')
  @Roles(Perfil.Admin)
  actualizar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePostoDto,
  ) {
    return this.localizacaoService.actualizarPosto(id, dto);
  }

  @Delete(':id')
  @Roles(Perfil.Admin)
  remover(@Param('id', ParseIntPipe) id: number) {
    return this.localizacaoService.removerPosto(id);
  }
}
