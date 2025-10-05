import { Injectable, StreamableFile } from '@nestjs/common';
import {
  EstadoProjeto,
  Prisma,
  PrazoStatus,
  RelatorioQuinzenal,
} from '@prisma/client';
import { Workbook } from 'exceljs';
import PDFDocument from 'pdfkit';
import { PrismaService } from '../prisma/prisma.service';
import { SemaforoService } from '../projetos/semaforo.service';
import {
  DashboardExportQueryDto,
  DashboardOverviewQueryDto,
} from './dto/dashboard-overview-query.dto';

interface ProjetoResumo {
  id: number;
  nome: string;
  provincia: string | null;
  tipoProjeto: string;
  estado: EstadoProjeto;
  latitude: number | null;
  longitude: number | null;
  execFisicaPct: number | null;
  execFinanceiraPct: number | null;
  prazo: PrazoStatus | null;
  valorTotalContratos: number;
  valorGlobalMT: number | null;
  statusSemaforo: 'verde' | 'amarelo' | 'vermelho';
  motivosSemaforo: string[];
  riscoCurto: string | null;
  ultimaAtualizacao: string;
}

interface OverviewResponse {
  kpis: {
    totalEmCurso: number;
    totalConcluido: number;
    totalParado: number;
    valorTotalInvestimentoMT: number;
    mediaExecucaoFisica: number | null;
    riscosAtivos: number;
  };
  lista: {
    items: ProjetoResumo[];
    meta: {
      total: number;
      page: number;
      pageSize: number;
      totalPages: number;
    };
  };
}

@Injectable()
export class DashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly semaforoService: SemaforoService,
  ) {}

  async getOverview(
    query: DashboardOverviewQueryDto,
  ): Promise<OverviewResponse> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 10;
    const sortBy = query.sortBy ?? 'ultimaAtualizacao';
    const sortOrder = query.sortOrder ?? (sortBy === 'nome' ? 'asc' : 'desc');

    const summaries = await this.computeSummaries(query);

    const sorted = this.sortSummaries(summaries, sortBy, sortOrder);
    const total = sorted.length;
    const totalPages = total === 0 ? 0 : Math.ceil(total / pageSize);
    const start = (page - 1) * pageSize;
    const items = sorted.slice(start, start + pageSize);

    const kpis = this.computeKpis(sorted);

    return {
      kpis,
      lista: {
        items,
        meta: {
          total,
          page,
          pageSize,
          totalPages,
        },
      },
    };
  }

  async exportOverview(
    query: DashboardExportQueryDto,
  ): Promise<StreamableFile> {
    const summaries = this.sortSummaries(
      await this.computeSummaries(query),
      query.sortBy ?? 'ultimaAtualizacao',
      query.sortOrder ?? (query.sortBy === 'nome' ? 'asc' : 'desc'),
    );

    if (query.format === 'xlsx') {
      const buffer = await this.generateExcelBuffer(summaries);
      return new StreamableFile(buffer, {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        disposition: `attachment; filename="dashboard-${Date.now()}.xlsx"`,
      });
    }

    const buffer = await this.generatePdfBuffer(summaries);
    return new StreamableFile(buffer, {
      type: 'application/pdf',
      disposition: `attachment; filename="dashboard-${Date.now()}.pdf"`,
    });
  }

  private async computeSummaries(
    query: DashboardOverviewQueryDto,
  ): Promise<ProjetoResumo[]> {
    const where: Prisma.ProjetoWhereInput = {};

    if (query.provinciaId) {
      where.provinciaId = query.provinciaId;
    }

    if (query.tipoProjeto) {
      where.tipoProjeto = query.tipoProjeto;
    }

    if (query.estado) {
      where.estado = query.estado;
    }

    const projetos = await this.prisma.projeto.findMany({
      where,
      include: {
        provincia: true,
        contratos: true,
      },
      orderBy: { id: 'asc' },
    });

    if (projetos.length === 0) {
      return [];
    }

    const projetoIds = projetos.map((projeto) => projeto.id);

    const [relatoriosProjeto, relatoriosContratos] = await Promise.all([
      this.prisma.relatorioQuinzenal.findMany({
        where: {
          projetoId: { in: projetoIds },
          contratoId: null,
          deletedAt: null,
        },
        orderBy: [{ projetoId: 'asc' }, { dataRef: 'desc' }],
      }),
      this.prisma.relatorioQuinzenal.findMany({
        where: {
          projetoId: { in: projetoIds },
          contratoId: { not: null },
          deletedAt: null,
        },
        orderBy: [{ contratoId: 'asc' }, { dataRef: 'desc' }],
      }),
    ]);

    const relatorioProjetoMap = new Map<number, RelatorioQuinzenal>();
    for (const relatorio of relatoriosProjeto) {
      if (!relatorioProjetoMap.has(relatorio.projetoId)) {
        relatorioProjetoMap.set(relatorio.projetoId, relatorio);
      }
    }

    const relatorioContratoMap = new Map<number, RelatorioQuinzenal[]>();
    const contratosProcessados = new Set<number>();
    for (const relatorio of relatoriosContratos) {
      if (relatorio.contratoId === null) {
        continue;
      }
      if (contratosProcessados.has(relatorio.contratoId)) {
        continue;
      }
      contratosProcessados.add(relatorio.contratoId);
      const existentes = relatorioContratoMap.get(relatorio.projetoId) ?? [];
      existentes.push(relatorio);
      relatorioContratoMap.set(relatorio.projetoId, existentes);
    }

    return projetos.map((projeto) => {
      const relatorioProjeto = relatorioProjetoMap.get(projeto.id) ?? null;
      const relatoriosContratosProjeto =
        relatorioContratoMap.get(projeto.id) ?? [];

      const relatoriosParaRisco = [
        relatorioProjeto,
        ...relatoriosContratosProjeto,
      ].filter((item): item is RelatorioQuinzenal => Boolean(item));

      const ultimaDataRelatorio = relatoriosParaRisco.reduce<Date | null>(
        (maisRecente, relatorio) => {
          if (!maisRecente || relatorio.dataRef > maisRecente) {
            return relatorio.dataRef;
          }
          return maisRecente;
        },
        null,
      );

      const ultimaAtualizacaoData =
        ultimaDataRelatorio ?? projeto.updatedAt ?? projeto.createdAt;
      const ultimaAtualizacao = ultimaAtualizacaoData.toISOString();

      const riscoMaisRecente = relatoriosParaRisco
        .filter((relatorio) => Boolean(relatorio.risco?.trim()))
        .sort((a, b) => b.dataRef.getTime() - a.dataRef.getTime())[0]?.risco;
      const riscoNormalizado = riscoMaisRecente
        ? riscoMaisRecente.trim()
        : null;

      const { statusSemaforo, motivosSemaforo } = this.semaforoService.calcular(
        projeto.contratos,
        relatorioProjeto,
        relatoriosContratosProjeto,
      );

      const valorTotalContratos = projeto.contratos.reduce((acc, contrato) => {
        if (!contrato.valorContratoMT) {
          return acc;
        }
        return acc + Number(contrato.valorContratoMT);
      }, 0);

      const valorGlobal = projeto.valorGlobalMT
        ? Number(Number(projeto.valorGlobalMT).toFixed(2))
        : null;

      return {
        id: projeto.id,
        nome: projeto.nome,
        provincia: projeto.provincia?.nome ?? null,
        tipoProjeto: projeto.tipoProjeto,
        estado: projeto.estado,
        latitude: projeto.latitude ? Number(projeto.latitude) : null,
        longitude: projeto.longitude ? Number(projeto.longitude) : null,
        execFisicaPct: relatorioProjeto
          ? Number(relatorioProjeto.execFisicaPct)
          : null,
        execFinanceiraPct: relatorioProjeto
          ? Number(relatorioProjeto.execFinanceiraPct)
          : null,
        prazo: relatorioProjeto ? relatorioProjeto.prazo : null,
        valorTotalContratos: Number(valorTotalContratos.toFixed(2)),
        valorGlobalMT: valorGlobal,
        statusSemaforo,
        motivosSemaforo,
        riscoCurto: riscoNormalizado ? riscoNormalizado.slice(0, 140) : null,
        ultimaAtualizacao,
      };
    });
  }

  private sortSummaries(
    summaries: ProjetoResumo[],
    sortBy: string,
    sortOrder: 'asc' | 'desc',
  ): ProjetoResumo[] {
    if (summaries.length === 0) {
      return [];
    }

    const factor = sortOrder === 'asc' ? 1 : -1;

    const semaforoPeso: Record<string, number> = {
      vermelho: 3,
      amarelo: 2,
      verde: 1,
    };

    const prazoPeso: Record<string, number> = {
      [PrazoStatus.ATRASADO]: 3,
      [PrazoStatus.NO_PRAZO]: 2,
      [PrazoStatus.CONCLUIDO]: 1,
    } as Record<string, number>;

    return [...summaries].sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'nome':
          comparison = a.nome.localeCompare(b.nome, 'pt');
          break;
        case 'execFisicaPct':
          {
            const vazio = sortOrder === 'asc' ? Infinity : -Infinity;
            const valorA = a.execFisicaPct ?? vazio;
            const valorB = b.execFisicaPct ?? vazio;
            comparison = valorA - valorB;
          }
          break;
        case 'execFinanceiraPct':
          {
            const vazio = sortOrder === 'asc' ? Infinity : -Infinity;
            const valorA = a.execFinanceiraPct ?? vazio;
            const valorB = b.execFinanceiraPct ?? vazio;
            comparison = valorA - valorB;
          }
          break;
        case 'prazo':
          comparison =
            (prazoPeso[a.prazo ?? ''] ?? 0) - (prazoPeso[b.prazo ?? ''] ?? 0);
          break;
        case 'valorTotalContratos':
          comparison = a.valorTotalContratos - b.valorTotalContratos;
          break;
        case 'statusSemaforo':
          comparison =
            (semaforoPeso[a.statusSemaforo] ?? 0) -
            (semaforoPeso[b.statusSemaforo] ?? 0);
          break;
        case 'ultimaAtualizacao':
        default:
          comparison =
            new Date(a.ultimaAtualizacao).getTime() -
            new Date(b.ultimaAtualizacao).getTime();
          break;
      }

      if (comparison === 0 && sortBy !== 'nome') {
        comparison = a.nome.localeCompare(b.nome, 'pt');
      }

      return comparison * factor;
    });
  }

  private computeKpis(summaries: ProjetoResumo[]) {
    const totalEmCurso = summaries.filter(
      (item) => item.estado === EstadoProjeto.EmCurso,
    ).length;
    const totalConcluido = summaries.filter(
      (item) => item.estado === EstadoProjeto.Concluido,
    ).length;
    const totalParado = summaries.filter(
      (item) => item.estado === EstadoProjeto.Parado,
    ).length;

    const valorTotalInvestimentoMT = summaries.reduce((acc, item) => {
      return acc + (item.valorGlobalMT ?? 0);
    }, 0);

    const execValues = summaries
      .map((item) => item.execFisicaPct)
      .filter((valor): valor is number => typeof valor === 'number');

    const mediaExecucaoFisica =
      execValues.length > 0
        ? Number(
            (
              execValues.reduce((acc, valor) => acc + valor, 0) /
              execValues.length
            ).toFixed(2),
          )
        : null;

    const riscosAtivos = summaries.filter((item) =>
      Boolean(item.riscoCurto?.trim()),
    ).length;

    return {
      totalEmCurso,
      totalConcluido,
      totalParado,
      valorTotalInvestimentoMT: Number(valorTotalInvestimentoMT.toFixed(2)),
      mediaExecucaoFisica,
      riscosAtivos,
    };
  }

  private async generateExcelBuffer(items: ProjetoResumo[]): Promise<Buffer> {
    const workbook = new Workbook();
    const sheet = workbook.addWorksheet('Projetos');

    sheet.columns = [
      { header: 'ID', key: 'id', width: 8 },
      { header: 'Nome', key: 'nome', width: 32 },
      { header: 'Província', key: 'provincia', width: 20 },
      { header: 'Tipo', key: 'tipoProjeto', width: 18 },
      { header: '% Físico', key: 'execFisicaPct', width: 12 },
      { header: '% Financeiro', key: 'execFinanceiraPct', width: 14 },
      { header: 'Prazo', key: 'prazo', width: 14 },
      { header: 'Valor Contratos (MT)', key: 'valorTotalContratos', width: 20 },
      { header: 'Semáforo', key: 'statusSemaforo', width: 12 },
      { header: 'Risco', key: 'riscoCurto', width: 50 },
      { header: 'Última atualização', key: 'ultimaAtualizacao', width: 24 },
    ];

    items.forEach((item) => {
      sheet.addRow({
        ...item,
        execFisicaPct: item.execFisicaPct ?? '-',
        execFinanceiraPct: item.execFinanceiraPct ?? '-',
        prazo: item.prazo ?? '-',
        riscoCurto: item.riscoCurto ?? '-',
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  private async generatePdfBuffer(items: ProjetoResumo[]): Promise<Buffer> {
    return new Promise<Buffer>((resolve, reject) => {
      const doc = new PDFDocument({ margin: 40, size: 'A4' });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk) => chunks.push(chunk as Buffer));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', (err) => {
        if (err instanceof Error) {
          reject(err);
        } else {
          reject(new Error(String(err)));
        }
      });

      doc.fontSize(16).text('Dashboard Consolidado', { align: 'center' });
      doc.moveDown();

      items.forEach((item, index) => {
        doc
          .fontSize(12)
          .text(`${index + 1}. ${item.nome} (${item.provincia ?? 'N/D'})`);
        doc
          .fontSize(10)
          .text(
            `Tipo: ${item.tipoProjeto} | Semáforo: ${item.statusSemaforo.toUpperCase()} | Última atualização: ${new Date(
              item.ultimaAtualizacao,
            ).toLocaleDateString('pt-PT')}`,
          );
        doc
          .fontSize(10)
          .text(
            `Execução Fís.: ${item.execFisicaPct ?? 'N/D'} | Execução Fin.: ${
              item.execFinanceiraPct ?? 'N/D'
            } | Prazo: ${item.prazo ?? 'N/D'}`,
          );
        doc.fontSize(10).text(
          `Valor Contratos: ${item.valorTotalContratos.toLocaleString('pt-PT', {
            minimumFractionDigits: 2,
          })} MT`,
        );
        if (item.riscoCurto) {
          doc.fontSize(10).text(`Risco: ${item.riscoCurto}`, { width: 500 });
        }
        doc.moveDown();
      });

      doc.end();
    });
  }
}
