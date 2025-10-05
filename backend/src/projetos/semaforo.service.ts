import { Injectable } from '@nestjs/common';
import { Contrato, PrazoStatus, RelatorioQuinzenal } from '@prisma/client';

type SemaforoStatus = 'verde' | 'amarelo' | 'vermelho';

interface SemaforoResultado {
  statusSemaforo: SemaforoStatus;
  motivosSemaforo: string[];
}

@Injectable()
export class SemaforoService {
  calcular(
    contratos: Pick<Contrato, 'dataPrevistaFim'>[],
    ultimoProjetoRelatorio: RelatorioQuinzenal | null,
    ultimosContratosRelatorios: RelatorioQuinzenal[],
  ): SemaforoResultado {
    let status: SemaforoStatus = 'verde';
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
}
