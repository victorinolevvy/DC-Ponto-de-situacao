import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateContratoDto } from './dto/create-contrato.dto';
import { UpdateContratoDto } from './dto/update-contrato.dto';

@Injectable()
export class ContratosService {
  constructor(private readonly prisma: PrismaService) {}

  async listar(projetoId: number) {
    await this.ensureProjetoExists(projetoId);

    return this.prisma.contrato.findMany({
      where: { projetoId },
      orderBy: { dataPrevistaFim: 'asc' },
    });
  }

  async criar(projetoId: number, dto: CreateContratoDto) {
    await this.ensureProjetoExists(projetoId);

    const data: Prisma.ContratoCreateInput = {
      projeto: { connect: { id: projetoId } },
      tipoContrato: dto.tipoContrato,
      empresa: dto.empresa,
      chaveNaMao: dto.chaveNaMao ?? false,
    };

    if (dto.valorContratoMT !== undefined) {
      data.valorContratoMT = new Prisma.Decimal(dto.valorContratoMT);
    }

    if (dto.dataInicio) {
      data.dataInicio = new Date(dto.dataInicio);
    }

    if (dto.dataPrevistaFim) {
      data.dataPrevistaFim = new Date(dto.dataPrevistaFim);
    }

    return this.prisma.contrato.create({ data });
  }

  async actualizar(id: number, dto: UpdateContratoDto) {
    const data: Prisma.ContratoUpdateInput = {};

    if (dto.tipoContrato !== undefined) {
      data.tipoContrato = dto.tipoContrato;
    }

    if (dto.empresa !== undefined) {
      data.empresa = dto.empresa;
    }

    if (dto.valorContratoMT !== undefined) {
      data.valorContratoMT = new Prisma.Decimal(dto.valorContratoMT);
    }

    if (dto.dataInicio !== undefined) {
      data.dataInicio = dto.dataInicio ? new Date(dto.dataInicio) : null;
    }

    if (dto.dataPrevistaFim !== undefined) {
      data.dataPrevistaFim = dto.dataPrevistaFim
        ? new Date(dto.dataPrevistaFim)
        : null;
    }

    if (dto.chaveNaMao !== undefined) {
      data.chaveNaMao = dto.chaveNaMao;
    }

    const contrato = await this.prisma.contrato.update({
      where: { id },
      data,
    });

    return contrato;
  }

  private async ensureProjetoExists(id: number) {
    const exists = await this.prisma.projeto.findUnique({ where: { id } });
    if (!exists) {
      throw new NotFoundException('Projeto não encontrado.');
    }
  }
}
