import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProvinciaDto } from './dto/create-provincia.dto';
import { UpdateProvinciaDto } from './dto/update-provincia.dto';
import { CreateDistritoDto } from './dto/create-distrito.dto';
import { UpdateDistritoDto } from './dto/update-distrito.dto';
import { CreatePostoDto } from './dto/create-posto.dto';
import { UpdatePostoDto } from './dto/update-posto.dto';

@Injectable()
export class LocalizacaoService {
  constructor(private readonly prisma: PrismaService) {}

  listarProvincias() {
    return this.prisma.provincia.findMany({
      orderBy: { nome: 'asc' },
    });
  }

  criarProvincia(dto: CreateProvinciaDto) {
    return this.prisma.provincia.create({ data: dto });
  }

  actualizarProvincia(id: number, dto: UpdateProvinciaDto) {
    return this.prisma.provincia.update({ where: { id }, data: dto });
  }

  removerProvincia(id: number) {
    return this.prisma.provincia.delete({ where: { id } });
  }

  listarDistritos(provinciaId?: number) {
    return this.prisma.distrito.findMany({
      where: provinciaId ? { provinciaId } : undefined,
      orderBy: { nome: 'asc' },
    });
  }

  criarDistrito(dto: CreateDistritoDto) {
    return this.prisma.distrito.create({ data: dto });
  }

  actualizarDistrito(id: number, dto: UpdateDistritoDto) {
    return this.prisma.distrito.update({ where: { id }, data: dto });
  }

  removerDistrito(id: number) {
    return this.prisma.distrito.delete({ where: { id } });
  }

  listarPostos(distritoId?: number) {
    return this.prisma.postoAdm.findMany({
      where: distritoId ? { distritoId } : undefined,
      orderBy: { nome: 'asc' },
    });
  }

  criarPosto(dto: CreatePostoDto) {
    return this.prisma.postoAdm.create({ data: dto });
  }

  actualizarPosto(id: number, dto: UpdatePostoDto) {
    return this.prisma.postoAdm.update({ where: { id }, data: dto });
  }

  removerPosto(id: number) {
    return this.prisma.postoAdm.delete({ where: { id } });
  }
}
