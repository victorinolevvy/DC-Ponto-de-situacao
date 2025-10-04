import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMarcoDto } from './dto/create-marco.dto';

@Injectable()
export class MarcosService {
  constructor(private readonly prisma: PrismaService) {}

  async listar(projetoId: number) {
    await this.ensureProjetoExists(projetoId);

    return this.prisma.marco.findMany({
      where: { projetoId },
      orderBy: { data: 'asc' },
    });
  }

  async criar(projetoId: number, dto: CreateMarcoDto) {
    await this.ensureProjetoExists(projetoId);

    const data: Prisma.MarcoCreateInput = {
      projeto: { connect: { id: projetoId } },
      tipo: dto.tipo,
      data: new Date(dto.data),
    };

    if (dto.nota !== undefined) {
      data.nota = dto.nota;
    }

    return this.prisma.marco.create({ data });
  }

  private async ensureProjetoExists(id: number) {
    const exists = await this.prisma.projeto.findUnique({ where: { id } });
    if (!exists) {
      throw new NotFoundException('Projeto não encontrado.');
    }
  }
}
