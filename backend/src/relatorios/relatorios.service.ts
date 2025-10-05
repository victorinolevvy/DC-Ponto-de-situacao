import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Perfil, PrazoStatus, Prisma } from '@prisma/client';
import type { RelatorioQuinzenal } from '@prisma/client';
import { PinoLogger } from 'nestjs-pino';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRelatorioDto } from './dto/create-relatorio.dto';
import {
  EvolucaoQueryDto,
  ListRelatorioQueryDto,
} from './dto/list-relatorio.query';
import { UpdateRelatorioDto } from './dto/update-relatorio.dto';

interface CurrentUser {
  id: number;
  email: string;
  perfil: Perfil;
}

export interface ListResult<T> {
  items: T[];
  meta: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
}

@Injectable()
export class RelatoriosService {
  private readonly futureToleranceDays: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(RelatoriosService.name);
    const tolerance = Number(
      this.configService.get('RELATORIOS_TOLERANCIA_FUTURO_DIAS', 3),
    );
    this.futureToleranceDays = Number.isFinite(tolerance) ? tolerance : 3;
  }

  async criar(projetoId: number, dto: CreateRelatorioDto, user: CurrentUser) {
    await this.ensureProjetoExiste(projetoId);
    const contrato = await this.ensureContratoPertenceProjeto(
      projetoId,
      dto.contratoId,
    );
    const dataRef = new Date(dto.dataRef);
    this.validarDataRef(dataRef);
    this.validarConclusao(dto.prazo, dto.execFisicaPct);

    const data: Prisma.RelatorioQuinzenalCreateInput = {
      projeto: { connect: { id: projetoId } },
      contrato: contrato ? { connect: { id: contrato.id } } : undefined,
      dataRef,
      execFisicaPct: new Prisma.Decimal(dto.execFisicaPct),
      execFinanceiraPct: new Prisma.Decimal(dto.execFinanceiraPct),
      prazo: dto.prazo,
      risco: dto.risco?.trim() || undefined,
      mitigacao: dto.mitigacao?.trim() || undefined,
      autor: { connect: { id: user.id } },
    };

    const relatorio = await this.prisma.relatorioQuinzenal.create({ data });
    this.logger.info(
      {
        projetoId,
        relatorioId: relatorio.id,
        autorId: user.id,
        dataRef: relatorio.dataRef.toISOString(),
      },
      'Relatório quinzenal criado',
    );

    return relatorio;
  }

  async listar(
    projetoId: number,
    query: ListRelatorioQueryDto,
    user: CurrentUser,
  ): Promise<ListResult<RelatorioQuinzenal>> {
    await this.ensureProjetoExiste(projetoId);
    const where: Prisma.RelatorioQuinzenalWhereInput = {
      projetoId,
      deletedAt: null,
    };

    const dataRefFilter: Prisma.DateTimeFilter = {};

    if (query.from) {
      dataRefFilter.gte = new Date(query.from);
    }

    if (query.to) {
      dataRefFilter.lte = new Date(query.to);
    }

    if (Object.keys(dataRefFilter).length > 0) {
      where.dataRef = dataRefFilter;
    }

    if (query.contratoId) {
      where.contratoId = query.contratoId;
    }

    if (user.perfil === Perfil.Gestor) {
      where.autorUserId = user.id;
    }

    const orderBy = this.parseSort(query.sort);
    const take = query.pageSize ?? 10;
    const skip = (query.page - 1) * take;

    const [items, total] = await Promise.all([
      this.prisma.relatorioQuinzenal.findMany({
        where,
        orderBy,
        skip,
        take,
      }),
      this.prisma.relatorioQuinzenal.count({ where }),
    ]);

    return {
      items,
      meta: {
        total,
        page: query.page,
        pageSize: take,
        totalPages: total === 0 ? 0 : Math.ceil(total / take),
      },
    };
  }

  async obterDetalhe(id: number, user: CurrentUser) {
    const relatorio = await this.prisma.relatorioQuinzenal.findFirst({
      where: { id, deletedAt: null },
    });

    if (!relatorio) {
      throw new NotFoundException('Relatório não encontrado.');
    }

    if (user.perfil === Perfil.Gestor && relatorio.autorUserId !== user.id) {
      throw new ForbiddenException('Sem permissão para consultar.');
    }

    return relatorio;
  }

  async actualizar(id: number, dto: UpdateRelatorioDto, user: CurrentUser) {
    const existente = await this.prisma.relatorioQuinzenal.findFirst({
      where: { id, deletedAt: null },
    });

    if (!existente) {
      throw new NotFoundException('Relatório não encontrado.');
    }

    if (user.perfil === Perfil.Gestor && existente.autorUserId !== user.id) {
      throw new ForbiddenException('Sem permissão para actualizar.');
    }

    const data: Prisma.RelatorioQuinzenalUpdateInput = {};

    if (dto.dataRef !== undefined) {
      const dataRef = new Date(dto.dataRef);
      this.validarDataRef(dataRef);
      data.dataRef = dataRef;
    }

    if (dto.execFisicaPct !== undefined) {
      data.execFisicaPct = new Prisma.Decimal(dto.execFisicaPct);
    }

    if (dto.execFinanceiraPct !== undefined) {
      data.execFinanceiraPct = new Prisma.Decimal(dto.execFinanceiraPct);
    }

    const prazo = dto.prazo ?? existente.prazo;
    const execFisica = dto.execFisicaPct ?? Number(existente.execFisicaPct);
    this.validarConclusao(prazo, execFisica);

    if (dto.prazo !== undefined) {
      data.prazo = dto.prazo;
    }

    if ('risco' in dto) {
      data.risco = dto.risco?.trim() || null;
    }

    if ('mitigacao' in dto) {
      data.mitigacao = dto.mitigacao?.trim() || null;
    }

    if ('contratoId' in dto) {
      if (dto.contratoId === undefined || dto.contratoId === null) {
        data.contrato = { disconnect: true };
      } else {
        const contrato = await this.ensureContratoPertenceProjeto(
          existente.projetoId,
          dto.contratoId,
        );
        data.contrato = { connect: { id: contrato?.id ?? dto.contratoId } };
      }
    }

    const relatorio = await this.prisma.relatorioQuinzenal.update({
      where: { id: existente.id },
      data,
    });

    this.logger.info(
      {
        relatorioId: relatorio.id,
        projetoId: relatorio.projetoId,
        autorId: user.id,
        dataRef: relatorio.dataRef.toISOString(),
      },
      'Relatório quinzenal actualizado',
    );

    return relatorio;
  }

  async remover(id: number, user: CurrentUser) {
    if (user.perfil !== Perfil.Admin) {
      throw new ForbiddenException('Apenas administradores podem remover.');
    }

    const existente = await this.prisma.relatorioQuinzenal.findFirst({
      where: { id, deletedAt: null },
    });

    if (!existente) {
      throw new NotFoundException('Relatório não encontrado.');
    }

    await this.prisma.relatorioQuinzenal.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    this.logger.warn(
      {
        relatorioId: id,
        projetoId: existente.projetoId,
        autorId: user.id,
      },
      'Relatório quinzenal removido (soft-delete)',
    );

    return { success: true };
  }

  async obterEvolucao(
    projetoId: number,
    query: EvolucaoQueryDto,
    user: CurrentUser,
  ) {
    await this.ensureProjetoExiste(projetoId);
    const where: Prisma.RelatorioQuinzenalWhereInput = {
      projetoId,
      deletedAt: null,
    };

    if (query.contratoId) {
      where.contratoId = query.contratoId;
    }

    if (user.perfil === Perfil.Gestor) {
      where.autorUserId = user.id;
    }

    const relatorios = await this.prisma.relatorioQuinzenal.findMany({
      where,
      orderBy: { dataRef: 'asc' },
      select: {
        id: true,
        dataRef: true,
        execFisicaPct: true,
        execFinanceiraPct: true,
      },
    });

    return relatorios.map((relatorio) => ({
      id: relatorio.id,
      dataRef: relatorio.dataRef,
      valor:
        query.metric === 'financeira'
          ? Number(relatorio.execFinanceiraPct)
          : Number(relatorio.execFisicaPct),
    }));
  }

  async obterUltimaQuinzena(projetoId: number, user: CurrentUser) {
    await this.ensureProjetoExiste(projetoId);
    const where: Prisma.RelatorioQuinzenalWhereInput = {
      projetoId,
      deletedAt: null,
    };

    if (user.perfil === Perfil.Gestor) {
      where.autorUserId = user.id;
    }

    const relatorios = await this.prisma.relatorioQuinzenal.findMany({
      where,
      orderBy: { dataRef: 'desc' },
      take: 2,
    });

    const [ultimo, anterior] = relatorios;

    if (!ultimo) {
      return { ultimoRelatorio: null, deltas: null };
    }

    return {
      ultimoRelatorio: ultimo,
      anteriorRelatorio: anterior ?? null,
      deltas: anterior
        ? {
            execFisicaPct:
              Number(ultimo.execFisicaPct) - Number(anterior.execFisicaPct),
            execFinanceiraPct:
              Number(ultimo.execFinanceiraPct) -
              Number(anterior.execFinanceiraPct),
          }
        : null,
    };
  }

  private parseSort(
    sort?: string,
  ): Prisma.RelatorioQuinzenalOrderByWithRelationInput[] {
    if (!sort) {
      return [{ dataRef: 'desc' }];
    }

    const [field, direction] = sort.split(':');
    if (field.toLowerCase() === 'dataref') {
      return [{ dataRef: direction.toLowerCase() === 'asc' ? 'asc' : 'desc' }];
    }

    return [{ dataRef: 'desc' }];
  }

  private validarDataRef(dataRef: Date) {
    if (Number.isNaN(dataRef.getTime())) {
      throw new BadRequestException('Data de referência inválida.');
    }

    const limite = new Date();
    limite.setDate(limite.getDate() + this.futureToleranceDays);

    if (dataRef.getTime() > limite.getTime()) {
      throw new BadRequestException(
        `Data de referência não pode ser futura (máx. ${this.futureToleranceDays} dias).`,
      );
    }
  }

  private validarConclusao(prazo: PrazoStatus, execFisicaPct: number) {
    if (
      prazo === PrazoStatus.CONCLUIDO &&
      Number(execFisicaPct.toFixed(2)) !== 100
    ) {
      throw new BadRequestException(
        'Projetos concluídos devem ter 100% de execução física.',
      );
    }
  }

  private async ensureProjetoExiste(projetoId: number) {
    const projeto = await this.prisma.projeto.findUnique({
      where: { id: projetoId },
      select: { id: true },
    });

    if (!projeto) {
      throw new NotFoundException('Projeto não encontrado.');
    }
  }

  private async ensureContratoPertenceProjeto(
    projetoId: number,
    contratoId?: number,
  ) {
    if (!contratoId) {
      return null;
    }

    const contrato = await this.prisma.contrato.findUnique({
      where: { id: contratoId },
      select: { id: true, projetoId: true },
    });

    if (!contrato || contrato.projetoId !== projetoId) {
      throw new BadRequestException('Contrato não pertence ao projeto.');
    }

    return contrato;
  }
}
