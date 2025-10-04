import { Injectable, NotFoundException } from '@nestjs/common';
import {
  Prisma,
  EstadoProjeto,
  TipoProjeto,
  PrazoStatus,
  RelatorioQuinzenal,
  Contrato,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProjetoDto } from './dto/create-projeto.dto';
import { UpdateProjetoDto } from './dto/update-projeto.dto';
import { FilterProjetoDto } from './dto/filter-projeto.dto';

@Injectable()
export class ProjetosService {
  constructor(private readonly prisma: PrismaService) {}

  async criar(dto: CreateProjetoDto) {
    const data: Prisma.ProjetoCreateInput = {
      nome: dto.nome,
      tipoProjeto: dto.tipoProjeto ?? TipoProjeto.FV,
      provincia: { connect: { id: dto.provinciaId } },
      chaveNaMao: dto.chaveNaMao ?? false,
      estado: dto.estado ?? EstadoProjeto.EmCurso,
    };

    if (dto.distritoId) {
      data.distrito = { connect: { id: dto.distritoId } };
    }

    if (dto.postoAdmId) {
      data.postoAdm = { connect: { id: dto.postoAdmId } };
    }

    if (dto.latitude !== undefined) {
      data.latitude = new Prisma.Decimal(dto.latitude);
    }

    if (dto.longitude !== undefined) {
      data.longitude = new Prisma.Decimal(dto.longitude);
    }

    if (dto.valorGlobalMT !== undefined) {
      data.valorGlobalMT = new Prisma.Decimal(dto.valorGlobalMT);
    }

    return this.prisma.projeto.create({ data });
  }

  async listar(filtro: FilterProjetoDto) {
    const where: Prisma.ProjetoWhereInput = {};

    if (filtro.tipoProjeto) {
      where.tipoProjeto = filtro.tipoProjeto;
    }

    if (filtro.estado) {
      where.estado = filtro.estado;
    }

    if (filtro.provinciaId) {
      where.provinciaId = filtro.provinciaId;
    }

    if (filtro.distritoId) {
      where.distritoId = filtro.distritoId;
    }

    if (filtro.search) {
      where.nome = { contains: filtro.search, mode: 'insensitive' };
    }

    return this.prisma.projeto.findMany({
      where,
      include: {
        provincia: true,
        distrito: true,
        postoAdm: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async obter(id: number) {
    const projeto = await this.prisma.projeto.findUnique({
      where: { id },
      include: {
        provincia: true,
        distrito: true,
        postoAdm: true,
        contratos: true,
        marcos: true,
        relatorios: {
          orderBy: { dataRef: 'desc' },
        },
      },
    });

    if (!projeto) {
      throw new NotFoundException('Projeto não encontrado.');
    }

    return projeto;
  }

  async obterResumo(id: number) {
    const projeto = await this.prisma.projeto.findUnique({
      where: { id },
      include: {
        contratos: true,
        marcos: true,
      },
    });

    if (!projeto) {
      throw new NotFoundException('Projeto não encontrado.');
    }

    const totalContratos = projeto.contratos.length;
    const valorTotal = projeto.contratos.reduce<number>((acc, contrato) => {
      if (!contrato.valorContratoMT) {
        return acc;
      }

      if (
        typeof contrato.valorContratoMT === 'object' &&
        'toNumber' in contrato.valorContratoMT &&
        typeof contrato.valorContratoMT.toNumber === 'function'
      ) {
        return acc + contrato.valorContratoMT.toNumber();
      }

      return acc + Number(contrato.valorContratoMT);
    }, 0);

    const now = new Date();
    const startOfToday = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    );
    const proximasDatasChave = projeto.marcos
      .filter((marco) => marco.data.getTime() >= startOfToday.getTime())
      .sort((a, b) => a.data.getTime() - b.data.getTime())
      .slice(0, 3)
      .map((marco) => ({
        id: marco.id,
        tipo: marco.tipo,
        data: marco.data,
        nota: marco.nota ?? undefined,
      }));

    const [ultimoProjetoRelatorio, ultimosContratosRelatorios] =
      await Promise.all([
        this.prisma.relatorioQuinzenal.findFirst({
          where: {
            projetoId: id,
            contratoId: null,
            deletedAt: null,
          },
          orderBy: { dataRef: 'desc' },
        }),
        this.prisma.relatorioQuinzenal.findMany({
          where: {
            projetoId: id,
            contratoId: { not: null },
            deletedAt: null,
          },
          orderBy: [{ contratoId: 'asc' }, { dataRef: 'desc' }],
          distinct: ['contratoId'],
        }),
      ]);

    const { statusSemaforo, motivosSemaforo } = this.avaliarSemaforo(
      projeto.contratos,
      ultimoProjetoRelatorio ?? null,
      ultimosContratosRelatorios,
    );

    return {
      totalContratos,
      valorTotalContratoMT: Number(valorTotal.toFixed(2)),
      proximasDatasChave,
      statusSemaforo,
      motivosSemaforo,
    };
  }

  private avaliarSemaforo(
    contratos: Contrato[],
    ultimoProjetoRelatorio: RelatorioQuinzenal | null,
    ultimosContratosRelatorios: RelatorioQuinzenal[],
  ) {
    let status: 'verde' | 'amarelo' | 'vermelho' = 'verde';
    const motivos = new Set<string>();

    const addMotivo = (motivo: string) => motivos.add(motivo);
    const riscoCritico = (texto?: string | null) => {
      if (!texto) {
        return false;
      }
      const normalized = texto.toLowerCase();
      const palavrasCriticas = [
        'bloqueio',
        'parado',
        'penalidade',
        'garantia',
        'litígio',
        'litigio',
        'falha crítica',
        'falha critica',
        'não conformidade',
        'nao conformidade',
      ];
      return palavrasCriticas.some((palavra) => normalized.includes(palavra));
    };

    const ultimaDiferencaProjeto = ultimoProjetoRelatorio
      ? Number(ultimoProjetoRelatorio.execFinanceiraPct) -
        Number(ultimoProjetoRelatorio.execFisicaPct)
      : null;
    const diferencasContratos = ultimosContratosRelatorios
      .filter((relatorio) => relatorio.contratoId !== null)
      .map(
        (relatorio) =>
          Number(relatorio.execFinanceiraPct) - Number(relatorio.execFisicaPct),
      );

    if (ultimoProjetoRelatorio?.prazo === PrazoStatus.ATRASADO) {
      status = 'vermelho';
      addMotivo('prazo_atrasado_projeto');
    }

    if (
      ultimosContratosRelatorios.some(
        (relatorio) => relatorio.prazo === PrazoStatus.ATRASADO,
      )
    ) {
      status = 'vermelho';
      addMotivo('prazo_atrasado_contrato');
    }

    if (ultimaDiferencaProjeto !== null && ultimaDiferencaProjeto > 10) {
      status = 'vermelho';
      addMotivo('derrapagem_fisica_maior_10pp');
    }

    if (diferencasContratos.some((diferenca) => diferenca > 10)) {
      status = 'vermelho';
      addMotivo('derrapagem_fisica_maior_10pp_contrato');
    }

    const riscoCriticoPresente =
      riscoCritico(ultimoProjetoRelatorio?.risco) ||
      ultimosContratosRelatorios.some((relatorio) =>
        riscoCritico(relatorio.risco),
      );

    if (riscoCriticoPresente) {
      status = 'vermelho';
      addMotivo('risco_critico_texto');
    }

    if (status === 'vermelho') {
      return { statusSemaforo: status, motivosSemaforo: Array.from(motivos) };
    }

    const riscoMonitorizadoProjeto =
      ultimoProjetoRelatorio?.prazo === PrazoStatus.NO_PRAZO &&
      Boolean(ultimoProjetoRelatorio.risco?.trim());
    const riscoMonitorizadoContratos = ultimosContratosRelatorios.some(
      (relatorio) =>
        relatorio.prazo === PrazoStatus.NO_PRAZO &&
        Boolean(relatorio.risco?.trim()),
    );

    if (riscoMonitorizadoProjeto || riscoMonitorizadoContratos) {
      status = 'amarelo';
      addMotivo('risco_em_monitorizacao');
    }

    if (
      ultimaDiferencaProjeto !== null &&
      ultimaDiferencaProjeto >= 5 &&
      ultimaDiferencaProjeto <= 10
    ) {
      status = 'amarelo';
      addMotivo('derrapagem_fisica_ate_10pp');
    }

    if (
      diferencasContratos.some((diferenca) => diferenca >= 5 && diferenca <= 10)
    ) {
      status = 'amarelo';
      addMotivo('derrapagem_fisica_ate_10pp_contrato');
    }

    const proximasEntregas = contratos
      .map((contrato) => contrato.dataPrevistaFim)
      .filter((data): data is Date => Boolean(data))
      .map((data) => {
        const diffMs = data.getTime() - Date.now();
        return diffMs / (1000 * 60 * 60 * 24);
      });

    if (proximasEntregas.some((dias) => dias >= 0 && dias <= 15)) {
      status = 'amarelo';
      addMotivo('prazo_contrato_ate_15dias');
    }

    return { statusSemaforo: status, motivosSemaforo: Array.from(motivos) };
  }

  async actualizar(id: number, dto: UpdateProjetoDto) {
    const data: Prisma.ProjetoUpdateInput = {};

    if (dto.nome !== undefined) data.nome = dto.nome;
    if (dto.tipoProjeto !== undefined) data.tipoProjeto = dto.tipoProjeto;
    if (dto.chaveNaMao !== undefined) data.chaveNaMao = dto.chaveNaMao;
    if (dto.estado !== undefined) data.estado = dto.estado;
    if (dto.latitude !== undefined)
      data.latitude = new Prisma.Decimal(dto.latitude);
    if (dto.longitude !== undefined)
      data.longitude = new Prisma.Decimal(dto.longitude);
    if (dto.valorGlobalMT !== undefined)
      data.valorGlobalMT = new Prisma.Decimal(dto.valorGlobalMT);
    if (dto.provinciaId !== undefined)
      data.provincia = { connect: { id: dto.provinciaId } };
    if (dto.distritoId !== undefined) {
      data.distrito = dto.distritoId
        ? { connect: { id: dto.distritoId } }
        : { disconnect: true };
    }
    if (dto.postoAdmId !== undefined) {
      data.postoAdm = dto.postoAdmId
        ? { connect: { id: dto.postoAdmId } }
        : { disconnect: true };
    }

    return this.prisma.projeto.update({ where: { id }, data });
  }
}
