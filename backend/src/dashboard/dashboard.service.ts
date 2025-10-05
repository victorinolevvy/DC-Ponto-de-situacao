import { Injectable, StreamableFile } from '@nestjs/common';
import {
  EstadoProjeto,
  Prisma,
  PrazoStatus,
  RelatorioQuinzenal,
  TipoProjeto,
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
  riscoCompleto: string | null;
  riscoCurto: string | null;
  ultimaAtualizacao: string;
}

interface FilterMetadata {
  provincia: string;
  tipoProjeto: string;
  estado: string;
  generatedAt: Date;
}

export interface OverviewResponse {
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
    const filterMetadata = await this.resolveFilterMetadata(query);

    if (query.format === 'xlsx') {
      const buffer = await this.generateExcelBuffer(summaries, filterMetadata);
      return new StreamableFile(buffer, {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        disposition: `attachment; filename="dashboard-${Date.now()}.xlsx"`,
      });
    }

    const buffer = await this.generatePdfBuffer(summaries, filterMetadata);
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
        riscoCompleto: riscoNormalizado,
        riscoCurto: riscoNormalizado
          ? this.truncateWithEllipsis(riscoNormalizado, 140)
          : null,
        ultimaAtualizacao,
      };
    });
  }

  private async resolveFilterMetadata(
    query: DashboardOverviewQueryDto,
  ): Promise<FilterMetadata> {
    const metadata: FilterMetadata = {
      provincia: 'Todas',
      tipoProjeto: 'Todos',
      estado: 'Todos',
      generatedAt: new Date(),
    };

    if (query.provinciaId) {
      const provincia = await this.prisma.provincia.findUnique({
        where: { id: query.provinciaId },
        select: { nome: true },
      });
      metadata.provincia = provincia?.nome ?? `ID ${query.provinciaId}`;
    }

    if (query.tipoProjeto) {
      const tipoLabels: Record<TipoProjeto, string> = {
        FV: 'Fotovoltaico',
        Hidrica: 'Hídrica',
        MiniRede: 'Mini-rede',
        Outro: 'Outro',
      };
      metadata.tipoProjeto = tipoLabels[query.tipoProjeto] ?? query.tipoProjeto;
    }

    if (query.estado) {
      const estadoLabels: Record<EstadoProjeto, string> = {
        EmCurso: 'Em curso',
        Concluido: 'Concluído',
        Parado: 'Parado',
      };
      metadata.estado = estadoLabels[query.estado] ?? query.estado;
    }

    return metadata;
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

  private truncateWithEllipsis(value: string, maxLength: number): string {
    if (value.length <= maxLength) {
      return value;
    }

    return `${value.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`;
  }

  private async generateExcelBuffer(
    items: ProjetoResumo[],
    filters: FilterMetadata,
  ): Promise<Buffer> {
    const workbook = new Workbook();
    const sheet = workbook.addWorksheet('Projetos', {
      properties: { tabColor: { argb: 'FF2563EB' } },
    });

    sheet.mergeCells(1, 1, 1, 10);
    const titleCell = sheet.getCell('A1');
    titleCell.value = 'Dashboard consolidado de projectos';
    titleCell.font = { bold: true, size: 16, color: { argb: 'FF0F172A' } };
    titleCell.alignment = { horizontal: 'center' };

    sheet.mergeCells(2, 1, 2, 10);
    const filtersCell = sheet.getCell('A2');
    filtersCell.value = `Filtros aplicados — Província: ${filters.provincia} | Tipo: ${filters.tipoProjeto} | Estado: ${filters.estado}`;
    filtersCell.font = { italic: true, color: { argb: 'FF475569' } };
    filtersCell.alignment = { horizontal: 'center' };

    sheet.mergeCells(3, 1, 3, 10);
    const generatedCell = sheet.getCell('A3');
    generatedCell.value = `Gerado em ${filters.generatedAt.toLocaleString('pt-PT')}`;
    generatedCell.font = { size: 10, color: { argb: 'FF64748B' } };
    generatedCell.alignment = { horizontal: 'center' };

    sheet.addRow([]);

    const headerRow = sheet.addRow([
      'Projeto',
      'Província',
      'Tipo',
      '% Físico',
      '% Financeiro',
      'Prazo',
      'Valor (MT)',
      'Semáforo',
      'Último Risco',
      'Última Atualização',
    ]);
    headerRow.font = { bold: true, color: { argb: 'FF0F172A' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE2E8F0' },
    };
    headerRow.alignment = {
      vertical: 'middle',
      horizontal: 'center',
      wrapText: true,
    };

    sheet.autoFilter = {
      from: { row: headerRow.number, column: 1 },
      to: { row: headerRow.number, column: 10 },
    };

    sheet.views = [{ state: 'frozen', ySplit: headerRow.number }];

    const columnWidths = [32, 20, 16, 12, 14, 14, 18, 14, 48, 24];
    columnWidths.forEach((width, index) => {
      const column = sheet.getColumn(index + 1);
      column.width = width;
      column.alignment =
        index >= 3 && index <= 7
          ? { horizontal: 'center', vertical: 'middle', wrapText: true }
          : { vertical: 'middle', wrapText: true };
    });

    sheet.getColumn(9).alignment = {
      vertical: 'top',
      wrapText: true,
    };

    items.forEach((item) => {
      const row = sheet.addRow([
        item.nome,
        item.provincia ?? '—',
        item.tipoProjeto,
        item.execFisicaPct != null ? item.execFisicaPct / 100 : null,
        item.execFinanceiraPct != null ? item.execFinanceiraPct / 100 : null,
        item.prazo ?? '—',
        item.valorTotalContratos,
        item.statusSemaforo.toUpperCase(),
        item.riscoCompleto ?? '—',
        new Date(item.ultimaAtualizacao),
      ]);

      const fisicaCell = row.getCell(4);
      if (item.execFisicaPct != null) {
        fisicaCell.numFmt = '0.00%';
      } else {
        fisicaCell.value = '—';
      }

      const financeiraCell = row.getCell(5);
      if (item.execFinanceiraPct != null) {
        financeiraCell.numFmt = '0.00%';
      } else {
        financeiraCell.value = '—';
      }

      row.getCell(7).numFmt = '#,##0.00 "MT"';
      row.getCell(8).alignment = {
        horizontal: 'center',
        vertical: 'middle',
      };
      row.getCell(10).numFmt = 'dd/mm/yyyy hh:mm';
      row.commit();
    });

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  private async generatePdfBuffer(
    items: ProjetoResumo[],
    filters: FilterMetadata,
  ): Promise<Buffer> {
    return new Promise<Buffer>((resolve, reject) => {
      const doc = new PDFDocument({ margin: 32, size: 'A4' });
      const chunks: Buffer[] = [];
      let currentPageNumber = 1;

      doc.on('data', (chunk) => chunks.push(chunk as Buffer));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', (err) => {
        if (err instanceof Error) {
          reject(err);
        } else {
          reject(new Error(String(err)));
        }
      });
      doc.on('pageAdded', () => {
        currentPageNumber += 1;
      });

      const columnWidths = [80, 54, 50, 38, 38, 48, 60, 48, 80, 50];
      const totalWidth = columnWidths.reduce((acc, value) => acc + value, 0);
      const tableX = doc.page.margins.left;
      let currentY = doc.page.margins.top;

      function addFooter() {
        const footerY = doc.page.height - doc.page.margins.bottom + 6;
        doc
          .strokeColor('#CBD5F5')
          .moveTo(tableX, footerY - 12)
          .lineTo(tableX + totalWidth, footerY - 12)
          .stroke();
        doc
          .fontSize(9)
          .fillColor('#475569')
          .text(
            `Gerado em ${filters.generatedAt.toLocaleString('pt-PT')}`,
            tableX,
            footerY - 10,
            { width: totalWidth / 2 },
          );
        doc.text(
          `Página ${currentPageNumber}`,
          tableX + totalWidth / 2,
          footerY - 10,
          {
            width: totalWidth / 2,
            align: 'right',
          },
        );
      }

      const headerLabels = [
        'Projeto',
        'Província',
        'Tipo',
        '% Físico',
        '% Financeiro',
        'Prazo',
        'Valor (MT)',
        'Semáforo',
        'Último Risco',
        'Última Atualização',
      ];

      function drawRow(cells: string[], isHeader = false) {
        doc
          .fontSize(isHeader ? 10 : 9)
          .fillColor(isHeader ? '#0F172A' : '#1F2937');
        const heights = cells.map((cell, index) =>
          doc.heightOfString(cell, {
            width: columnWidths[index],
          }),
        );
        const rowHeight = Math.max(...heights) + (isHeader ? 4 : 2);

        if (
          currentY + rowHeight >
          doc.page.height - doc.page.margins.bottom - (isHeader ? 40 : 24)
        ) {
          addFooter();
          doc.addPage();
          currentY = doc.page.margins.top;
          addHeader();
        }

        let x = tableX;
        cells.forEach((cell, index) => {
          const align = index >= 3 && index <= 7 ? 'center' : 'left';
          doc.text(cell, x, currentY, {
            width: columnWidths[index],
            align,
          });
          x += columnWidths[index];
          doc.x = x;
          doc.y = currentY;
        });

        currentY += rowHeight;
        doc
          .strokeColor(isHeader ? '#94A3B8' : '#E2E8F0')
          .lineWidth(isHeader ? 1 : 0.5)
          .moveTo(tableX, currentY)
          .lineTo(tableX + totalWidth, currentY)
          .stroke();
        currentY += 6;
      }

      function addHeader() {
        doc.fillColor('#0F172A');
        doc.rect(tableX, currentY - 4, 36, 36).fill('#0F172A');
        doc
          .fillColor('#0F172A')
          .fontSize(18)
          .text('Ponto de Situação Consolidado', tableX + 44, currentY);
        doc
          .fontSize(10)
          .fillColor('#475569')
          .text(
            'Direcção Nacional de Electrificação Rural',
            tableX + 44,
            doc.y,
            {
              width: totalWidth - 44,
            },
          );
        doc.moveDown(0.5);
        doc
          .fontSize(10)
          .fillColor('#475569')
          .text(
            `Filtros: Província = ${filters.provincia} | Tipo = ${filters.tipoProjeto} | Estado = ${filters.estado}`,
            tableX,
            doc.y,
            { width: totalWidth },
          );
        doc.moveDown(0.3);
        doc
          .fontSize(10)
          .fillColor('#475569')
          .text(
            `Gerado em ${filters.generatedAt.toLocaleString('pt-PT')}`,
            tableX,
            doc.y,
            { width: totalWidth },
          );
        currentY = doc.y + 12;
        drawRow(headerLabels, true);
      }

      addHeader();

      if (items.length === 0) {
        doc
          .fontSize(11)
          .fillColor('#475569')
          .text(
            'Sem projectos para os filtros seleccionados.',
            tableX,
            currentY + 8,
            {
              width: totalWidth,
              align: 'center',
            },
          );
        addFooter();
        doc.end();
        return;
      }

      const formatPercent = (value: number | null) =>
        value != null ? `${value.toFixed(1)}%` : '—';
      const formatCurrency = (value: number) =>
        new Intl.NumberFormat('pt-PT', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }).format(value);

      items.forEach((item) => {
        drawRow([
          item.nome,
          item.provincia ?? '—',
          item.tipoProjeto,
          formatPercent(item.execFisicaPct),
          formatPercent(item.execFinanceiraPct),
          item.prazo ?? '—',
          `${formatCurrency(item.valorTotalContratos)} MT`,
          item.statusSemaforo.toUpperCase(),
          item.riscoCompleto ?? '—',
          new Date(item.ultimaAtualizacao).toLocaleString('pt-PT'),
        ]);
      });

      addFooter();
      doc.end();
    });
  }
}
