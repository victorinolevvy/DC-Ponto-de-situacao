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
import { CreateDistritoDto } from './dto/create-distrito.dto';
import { UpdateDistritoDto } from './dto/update-distrito.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('Distritos')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('distritos')
export class DistritosController {
  constructor(private readonly localizacaoService: LocalizacaoService) {}

  @Get()
  @ApiQuery({ name: 'provinciaId', required: false, type: Number })
  listar(@Query('provinciaId') provinciaId?: number) {
    return this.localizacaoService.listarDistritos(
      provinciaId ? Number(provinciaId) : undefined,
    );
  }

  @Post()
  @Roles(Perfil.Admin)
  criar(@Body() dto: CreateDistritoDto) {
    return this.localizacaoService.criarDistrito(dto);
  }

  @Patch(':id')
  @Roles(Perfil.Admin)
  actualizar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateDistritoDto,
  ) {
    return this.localizacaoService.actualizarDistrito(id, dto);
  }

  @Delete(':id')
  @Roles(Perfil.Admin)
  remover(@Param('id', ParseIntPipe) id: number) {
    return this.localizacaoService.removerDistrito(id);
  }
}
