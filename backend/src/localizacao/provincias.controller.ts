import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Perfil } from '@prisma/client';
import { LocalizacaoService } from './localizacao.service';
import { CreateProvinciaDto } from './dto/create-provincia.dto';
import { UpdateProvinciaDto } from './dto/update-provincia.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('Provincias')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('provincias')
export class ProvinciasController {
  constructor(private readonly localizacaoService: LocalizacaoService) {}

  @Get()
  listar() {
    return this.localizacaoService.listarProvincias();
  }

  @Post()
  @Roles(Perfil.Admin)
  criar(@Body() dto: CreateProvinciaDto) {
    return this.localizacaoService.criarProvincia(dto);
  }

  @Patch(':id')
  @Roles(Perfil.Admin)
  actualizar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateProvinciaDto,
  ) {
    return this.localizacaoService.actualizarProvincia(id, dto);
  }

  @Delete(':id')
  @Roles(Perfil.Admin)
  remover(@Param('id', ParseIntPipe) id: number) {
    return this.localizacaoService.removerProvincia(id);
  }
}
