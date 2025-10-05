import { useEffect, useMemo, useState } from 'react';
import { MapContainer, Marker, Popup, TileLayer } from 'react-leaflet';
import L from 'leaflet';
import { clsx } from 'clsx';
import 'leaflet/dist/leaflet.css';

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';

const tipoProjetoOptions = [
  { value: '', label: 'Todos os tipos' },
  { value: 'FV', label: 'Fotovoltaico' },
  { value: 'Hidrica', label: 'Hídrica' },
  { value: 'MiniRede', label: 'Mini-rede' },
  { value: 'Outro', label: 'Outro' },
] as const;

const estadoProjetoOptions = [
  { value: '', label: 'Todos os estados' },
  { value: 'EmCurso', label: 'Em curso' },
  { value: 'Concluido', label: 'Concluído' },
  { value: 'Parado', label: 'Parado' },
] as const;

const prazoLabels: Record<string, string> = {
  NO_PRAZO: 'No prazo',
  ATRASADO: 'Atrasado',
  CONCLUIDO: 'Concluído',
};

const semaforoLabels: Record<SemaforoStatus, string> = {
  verde: 'Verde',
  amarelo: 'Amarelo',
  vermelho: 'Vermelho',
};

const motivoLabels: Record<string, string> = {
  prazo_atrasado_projeto: 'Prazo atrasado (projeto)',
  prazo_atrasado_contrato: 'Prazo atrasado (contrato)',
  derrapagem_fisica_maior_10pp: 'Execução física >10pp abaixo (projeto)',
  derrapagem_fisica_maior_10pp_contrato: 'Execução física >10pp abaixo (contrato)',
  risco_critico_texto: 'Risco crítico identificado',
  risco_em_monitorizacao: 'Risco em monitorização',
  derrapagem_fisica_ate_10pp: 'Execução física 5-10pp abaixo (projeto)',
  derrapagem_fisica_ate_10pp_contrato: 'Execução física 5-10pp abaixo (contrato)',
  prazo_contrato_ate_15dias: 'Contrato a ≤15 dias do fim',
};

const semaforoHex: Record<SemaforoStatus, string> = {
  verde: '#16a34a',
  amarelo: '#f59e0b',
  vermelho: '#dc2626',
};

const mozCenter: [number, number] = [-18.665695, 35.529562];

type SemaforoStatus = 'verde' | 'amarelo' | 'vermelho';

interface Kpis {
  totalEmCurso: number;
  totalConcluido: number;
  totalParado: number;
  valorTotalInvestimentoMT: number;
  mediaExecucaoFisica: number | null;
  riscosAtivos: number;
}

interface ProjectListItem {
  id: number;
  nome: string;
  provincia: string | null;
  tipoProjeto: string;
  estado: string;
  latitude: number | null;
  longitude: number | null;
  execFisicaPct: number | null;
  execFinanceiraPct: number | null;
  prazo: 'NO_PRAZO' | 'ATRASADO' | 'CONCLUIDO' | null;
  valorTotalContratos: number;
  valorGlobalMT: number | null;
  statusSemaforo: SemaforoStatus;
  motivosSemaforo: string[];
  riscoCurto: string | null;
  ultimaAtualizacao: string;
}

interface DashboardResponse {
  success: boolean;
  data: {
    kpis: Kpis;
    lista: {
      items: ProjectListItem[];
      meta: { total: number; page: number; pageSize: number; totalPages: number };
    };
  };
}

interface Provincia {
  id: number;
  nome: string;
}

type SortableField =
  | 'nome'
  | 'execFisicaPct'
  | 'execFinanceiraPct'
  | 'prazo'
  | 'valorTotalContratos'
  | 'ultimaAtualizacao'
  | 'statusSemaforo';

type FiltersState = {
  provinciaId: string;
  tipoProjeto: string;
  estado: string;
  page: number;
  pageSize: number;
  sortBy: SortableField;
  sortOrder: 'asc' | 'desc';
};

const iconCache: Partial<Record<SemaforoStatus, L.DivIcon>> = {};

function getSemaforoIcon(status: SemaforoStatus) {
  if (!iconCache[status]) {
    iconCache[status] = L.divIcon({
      className: 'semaforo-marker',
      html: `<span style="background:${semaforoHex[status]};width:18px;height:18px;border-radius:9999px;display:inline-block;border:2px solid #fff;box-shadow:0 2px 6px rgba(15,23,42,0.25);"></span>`,
      iconSize: [18, 18],
      iconAnchor: [9, 9],
      popupAnchor: [0, -9],
    });
  }
  return iconCache[status]!;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-PT', {
    style: 'currency',
    currency: 'MZN',
    maximumFractionDigits: 0,
  }).format(value);
}

function formatPercent(value: number | null) {
  return typeof value === 'number' ? `${value.toFixed(1)}%` : '—';
}

function formatDateTime(value: string) {
  const date = new Date(value);
  return new Intl.DateTimeFormat('pt-PT', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(date);
}

function buildQueryParams(filters: FiltersState, includePagination = true) {
  const params = new URLSearchParams();
  if (filters.provinciaId) params.set('provinciaId', filters.provinciaId);
  if (filters.tipoProjeto) params.set('tipoProjeto', filters.tipoProjeto);
  if (filters.estado) params.set('estado', filters.estado);
  params.set('sortBy', filters.sortBy);
  params.set('sortOrder', filters.sortOrder);
  if (includePagination) {
    params.set('page', filters.page.toString());
    params.set('pageSize', filters.pageSize.toString());
  }
  return params;
}

const initialFilters: FiltersState = {
  provinciaId: '',
  tipoProjeto: '',
  estado: '',
  page: 1,
  pageSize: 10,
  sortBy: 'ultimaAtualizacao',
  sortOrder: 'desc',
};

function App() {
  const [filters, setFilters] = useState<FiltersState>(initialFilters);
  const [token, setToken] = useState(() => localStorage.getItem('accessToken') ?? '');
  const [tokenDraft, setTokenDraft] = useState(() => localStorage.getItem('accessToken') ?? '');
  const [data, setData] = useState<DashboardResponse['data'] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState<null | 'xlsx' | 'pdf'>(null);
  const [error, setError] = useState<string | null>(null);
  const [provincias, setProvincias] = useState<Provincia[]>([]);
  const [isFetchingProvincias, setIsFetchingProvincias] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    const fetchProvincias = async () => {
      setIsFetchingProvincias(true);
      try {
        const res = await fetch(`${API_BASE}/provincias`, {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          signal: controller.signal,
        });
        if (!res.ok) {
          throw new Error(res.status === 401 ? 'Não autenticado.' : 'Falha ao carregar províncias.');
        }
        const payload = (await res.json()) as { success: boolean; data: Provincia[] };
        if (payload.success) {
          setProvincias(payload.data);
        }
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          console.warn(err);
        }
      } finally {
        setIsFetchingProvincias(false);
      }
    };

    fetchProvincias();
    return () => controller.abort();
  }, [token]);

  useEffect(() => {
    const controller = new AbortController();
    const fetchDashboard = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const params = buildQueryParams(filters);
        const headers: Record<string, string> = {};
        if (token) {
          headers.Authorization = `Bearer ${token}`;
        }
        const res = await fetch(`${API_BASE}/dashboard/overview?${params.toString()}`, {
          headers,
          signal: controller.signal,
        });
        if (!res.ok) {
          throw new Error(res.status === 401 ? 'Não autenticado. Faça login e indique o token JWT.' : 'Não foi possível carregar o dashboard.');
        }
        const payload = (await res.json()) as DashboardResponse;
        if (!payload.success) {
          throw new Error('Resposta inesperada da API.');
        }
        setData(payload.data);
      } catch (err) {
        if ((err as Error).name === 'AbortError') {
          return;
        }
        setError((err as Error).message);
        setData(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboard();
    return () => controller.abort();
  }, [filters, token]);

  const handleFilterChange = (partial: Partial<Omit<FiltersState, 'page' | 'pageSize' | 'sortBy' | 'sortOrder'>> & { page?: number }) => {
    setFilters((prev) => ({
      ...prev,
      ...partial,
      page: partial.page ?? 1,
    }));
  };

  const handleSort = (field: SortableField) => {
    setFilters((prev) => {
      if (prev.sortBy === field) {
        return { ...prev, sortOrder: prev.sortOrder === 'asc' ? 'desc' : 'asc', page: 1 };
      }
      return { ...prev, sortBy: field, sortOrder: field === 'nome' ? 'asc' : 'desc', page: 1 };
    });
  };

  const handlePageChange = (page: number) => {
    setFilters((prev) => ({ ...prev, page }));
  };

  const handlePageSizeChange = (pageSize: number) => {
    setFilters((prev) => ({ ...prev, pageSize, page: 1 }));
  };

  const saveToken = () => {
    const normalized = tokenDraft.trim();
    if (normalized) {
      localStorage.setItem('accessToken', normalized);
    } else {
      localStorage.removeItem('accessToken');
    }
    setToken(normalized);
  };

  const clearToken = () => {
    localStorage.removeItem('accessToken');
    setTokenDraft('');
    setToken('');
  };

  const exportData = async (format: 'xlsx' | 'pdf') => {
    setError(null);
    setIsExporting(format);
    try {
      const params = buildQueryParams(filters, false);
      params.set('format', format);
      const headers: Record<string, string> = {};
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }
      const res = await fetch(`${API_BASE}/dashboard/overview/export?${params.toString()}`, {
        headers,
      });
      if (!res.ok) {
        throw new Error(res.status === 401 ? 'Não autenticado para exportar.' : 'Falha ao gerar exportação.');
      }
      const blob = await res.blob();
      const disposition = res.headers.get('content-disposition');
      let filename = `dashboard-overview.${format}`;
      if (disposition) {
        const match = disposition.match(/filename="?([^";]+)"?/i);
        if (match?.[1]) {
          filename = match[1];
        }
      }
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsExporting(null);
    }
  };

  const items = data?.lista.items ?? [];
  const meta = data?.lista.meta;
  const totalPages = meta?.totalPages ?? 0;

  const mapProjects = useMemo(() => items.filter((item) => item.latitude !== null && item.longitude !== null), [items]);
  const mapCenter = useMemo(() => {
    if (!mapProjects.length) {
      return mozCenter;
    }
    const { sumLat, sumLng } = mapProjects.reduce(
      (acc, item) => ({
        sumLat: acc.sumLat + (item.latitude ?? 0),
        sumLng: acc.sumLng + (item.longitude ?? 0),
      }),
      { sumLat: 0, sumLng: 0 },
    );
    return [sumLat / mapProjects.length, sumLng / mapProjects.length] as [number, number];
  }, [mapProjects]);

  const isEmpty = !isLoading && items.length === 0;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <header className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-slate-900">Dashboard consolidado</h1>
            <p className="mt-1 text-sm text-slate-600">
              Acompanha indicadores quinzenais dos projectos, com filtros e exportações consistentes.
            </p>
          </div>
          <div className="flex flex-col gap-2 rounded-lg border border-slate-200 bg-white p-3 text-sm shadow-sm lg:min-w-[320px]">
            <p className="font-medium text-slate-700">Token JWT</p>
            <p className="text-slate-500">
              Autentica-te via <code className="rounded bg-slate-100 px-1 py-0.5 text-xs">POST /auth/login</code> e cola o token abaixo.
            </p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                className="flex-1 rounded border border-slate-300 bg-white px-2 py-1 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
                value={tokenDraft}
                onChange={(event) => setTokenDraft(event.target.value)}
                placeholder="Bearer token"
              />
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={saveToken}
                  className="inline-flex items-center justify-center rounded-md bg-brand-600 px-3 py-1 text-sm font-medium text-white shadow-sm transition hover:bg-brand-500"
                >
                  Guardar
                </button>
                <button
                  type="button"
                  onClick={clearToken}
                  className="inline-flex items-center justify-center rounded-md border border-slate-300 px-3 py-1 text-sm text-slate-600 transition hover:bg-slate-100"
                >
                  Limpar
                </button>
              </div>
            </div>
          </div>
        </header>

        <section className="mb-6 grid gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard label="Projectos em curso" value={data?.kpis.totalEmCurso ?? 0} accent="emerald" />
            <KpiCard label="Projectos concluídos" value={data?.kpis.totalConcluido ?? 0} accent="cyan" />
            <KpiCard label="Projectos parados" value={data?.kpis.totalParado ?? 0} accent="rose" />
            <KpiCard label="Riscos activos" value={data?.kpis.riscosAtivos ?? 0} accent="amber" />
            <KpiCard
              label="Investimento total"
              value={data ? formatCurrency(data.kpis.valorTotalInvestimentoMT) : '—'}
              accent="indigo"
            />
            <KpiCard
              label="Execução física média"
              value={data?.kpis.mediaExecucaoFisica != null ? `${data.kpis.mediaExecucaoFisica.toFixed(1)}%` : '—'}
              accent="violet"
            />
          </div>
        </section>

        <section className="mb-6 grid gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="flex flex-col">
                <label htmlFor="provincia" className="text-xs font-medium text-slate-500">
                  Província
                </label>
                <select
                  id="provincia"
                  className="rounded-md border border-slate-300 bg-white px-2 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
                  value={filters.provinciaId}
                  onChange={(event) => handleFilterChange({ provinciaId: event.target.value })}
                  disabled={isFetchingProvincias}
                >
                  <option value="">Todas as províncias</option>
                  {provincias.map((provincia) => (
                    <option key={provincia.id} value={provincia.id}>
                      {provincia.nome}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col">
                <label htmlFor="tipo" className="text-xs font-medium text-slate-500">
                  Tipo de projecto
                </label>
                <select
                  id="tipo"
                  className="rounded-md border border-slate-300 bg-white px-2 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
                  value={filters.tipoProjeto}
                  onChange={(event) => handleFilterChange({ tipoProjeto: event.target.value })}
                >
                  {tipoProjetoOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col">
                <label htmlFor="estado" className="text-xs font-medium text-slate-500">
                  Estado
                </label>
                <select
                  id="estado"
                  className="rounded-md border border-slate-300 bg-white px-2 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
                  value={filters.estado}
                  onChange={(event) => handleFilterChange({ estado: event.target.value })}
                >
                  {estadoProjetoOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col">
                <label htmlFor="pageSize" className="text-xs font-medium text-slate-500">
                  Itens por página
                </label>
                <select
                  id="pageSize"
                  className="rounded-md border border-slate-300 bg-white px-2 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
                  value={filters.pageSize}
                  onChange={(event) => handlePageSizeChange(Number(event.target.value))}
                >
                  {[10, 20, 50].map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => setFilters(initialFilters)}
                className="inline-flex items-center rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-600 transition hover:bg-slate-100"
              >
                Limpar filtros
              </button>
              <button
                type="button"
                onClick={() => exportData('xlsx')}
                disabled={isExporting === 'xlsx' || isLoading}
                className={clsx(
                  'inline-flex items-center rounded-md bg-emerald-600 px-3 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-emerald-500',
                  (isExporting === 'xlsx' || isLoading) && 'cursor-not-allowed opacity-70',
                )}
              >
                {isExporting === 'xlsx' ? 'A gerar Excel…' : 'Exportar Excel'}
              </button>
              <button
                type="button"
                onClick={() => exportData('pdf')}
                disabled={isExporting === 'pdf' || isLoading}
                className={clsx(
                  'inline-flex items-center rounded-md bg-amber-600 px-3 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-amber-500',
                  (isExporting === 'pdf' || isLoading) && 'cursor-not-allowed opacity-70',
                )}
              >
                {isExporting === 'pdf' ? 'A gerar PDF…' : 'Exportar PDF'}
              </button>
            </div>
          </div>
          {error && (
            <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {error}
            </div>
          )}
        </section>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
          <section className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">Tabela consolidada</h2>
              {isLoading && (
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <span className="h-2 w-2 animate-ping rounded-full bg-brand-500" />
                  A carregar…
                </div>
              )}
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-100 text-xs uppercase tracking-wide text-slate-600">
                  <tr>
                    {[
                      { key: 'nome', label: 'Projecto', sortable: true },
                      { key: 'provincia', label: 'Província' },
                      { key: 'tipoProjeto', label: 'Tipo' },
                      { key: 'execFisicaPct', label: '% Físico', sortable: true },
                      { key: 'execFinanceiraPct', label: '% Financeiro', sortable: true },
                      { key: 'prazo', label: 'Prazo', sortable: true },
                      { key: 'valorTotalContratos', label: 'Valor contratos', sortable: true },
                      { key: 'statusSemaforo', label: 'Semáforo', sortable: true },
                      { key: 'riscoCurto', label: 'Risco' },
                      { key: 'ultimaAtualizacao', label: 'Última actualização', sortable: true },
                    ].map((column) => (
                      <th key={column.key} className="px-3 py-2 text-left">
                        {column.sortable ? (
                          <button
                            type="button"
                            onClick={() => handleSort(column.key as SortableField)}
                            className="flex items-center gap-1 font-semibold text-slate-700 hover:text-brand-600"
                          >
                            {column.label}
                            {filters.sortBy === column.key && (
                              <span>{filters.sortOrder === 'asc' ? '▲' : '▼'}</span>
                            )}
                          </button>
                        ) : (
                          <span className="font-semibold text-slate-700">{column.label}</span>
                        )}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50">
                      <td className="px-3 py-3 font-medium text-slate-900">{item.nome}</td>
                      <td className="px-3 py-3 text-slate-600">{item.provincia ?? '—'}</td>
                      <td className="px-3 py-3 text-slate-600">{item.tipoProjeto}</td>
                      <td className="px-3 py-3 text-slate-600">{formatPercent(item.execFisicaPct)}</td>
                      <td className="px-3 py-3 text-slate-600">{formatPercent(item.execFinanceiraPct)}</td>
                      <td className="px-3 py-3 text-slate-600">{item.prazo ? prazoLabels[item.prazo] : '—'}</td>
                      <td className="px-3 py-3 text-slate-600">{formatCurrency(item.valorTotalContratos)}</td>
                      <td className="px-3 py-3">
                        <div className="flex flex-col gap-1">
                          <span
                            className={clsx(
                              'inline-flex w-fit items-center gap-1 rounded-full px-2 py-1 text-xs font-medium text-white',
                              {
                                'bg-emerald-500': item.statusSemaforo === 'verde',
                                'bg-amber-500': item.statusSemaforo === 'amarelo',
                                'bg-rose-500': item.statusSemaforo === 'vermelho',
                              },
                            )}
                          >
                            {semaforoLabels[item.statusSemaforo]}
                          </span>
                          {item.motivosSemaforo.length > 0 && (
                            <ul className="text-xs text-slate-500">
                              {item.motivosSemaforo.map((motivo) => (
                                <li key={motivo}>• {motivoLabels[motivo] ?? motivo}</li>
                              ))}
                            </ul>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-3 text-slate-600">
                        {item.riscoCurto ? item.riscoCurto : '—'}
                      </td>
                      <td className="px-3 py-3 text-slate-600">{formatDateTime(item.ultimaAtualizacao)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {isEmpty && (
                <div className="px-3 py-6 text-center text-sm text-slate-500">
                  Nenhum projecto encontrado com os filtros actuais.
                </div>
              )}
            </div>
            {meta && meta.totalPages > 1 && (
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-3 text-sm text-slate-600">
                <span>
                  Página <strong>{meta.page}</strong> de <strong>{meta.totalPages}</strong>
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handlePageChange(Math.max(1, meta.page - 1))}
                    disabled={meta.page <= 1}
                    className={clsx(
                      'inline-flex items-center rounded-md border border-slate-300 px-3 py-1 transition hover:bg-slate-100',
                      meta.page <= 1 && 'cursor-not-allowed opacity-60',
                    )}
                  >
                    Anterior
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePageChange(Math.min(meta.totalPages, meta.page + 1))}
                    disabled={meta.page >= meta.totalPages}
                    className={clsx(
                      'inline-flex items-center rounded-md border border-slate-300 px-3 py-1 transition hover:bg-slate-100',
                      meta.page >= meta.totalPages && 'cursor-not-allowed opacity-60',
                    )}
                  >
                    Seguinte
                  </button>
                </div>
              </div>
            )}
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="mb-3 text-lg font-semibold text-slate-900">Mapa de projectos</h2>
            <MapContainer center={mapCenter} zoom={6} scrollWheelZoom className="overflow-hidden">
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap contributors" />
              {mapProjects.map((project) => (
                <Marker
                  key={project.id}
                  position={[project.latitude!, project.longitude!]}
                  icon={getSemaforoIcon(project.statusSemaforo)}
                >
                  <Popup>
                    <div className="space-y-1 text-sm">
                      <p className="font-semibold text-slate-900">{project.nome}</p>
                      <p className="text-slate-600">{project.provincia ?? 'Província indefinida'}</p>
                      <p className="text-slate-600">
                        Estado: <span className="font-medium">{semaforoLabels[project.statusSemaforo]}</span>
                      </p>
                      <p className="text-slate-600">
                        Execução física: <span className="font-medium">{formatPercent(project.execFisicaPct)}</span>
                      </p>
                      <p className="text-slate-600">
                        Última actualização: {formatDateTime(project.ultimaAtualizacao)}
                      </p>
                      {project.motivosSemaforo.length > 0 && (
                        <ul className="list-disc pl-4 text-xs text-slate-500">
                          {project.motivosSemaforo.map((motivo) => (
                            <li key={motivo}>{motivoLabels[motivo] ?? motivo}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
            <p className="mt-2 text-xs text-slate-500">
              Os marcadores utilizam cores do semáforo definitivo calculado a partir dos relatórios mais recentes.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}

function KpiCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: number | string;
  accent: 'emerald' | 'cyan' | 'rose' | 'amber' | 'indigo' | 'violet';
}) {
  const accentClasses: Record<'emerald' | 'cyan' | 'rose' | 'amber' | 'indigo' | 'violet', string> = {
    emerald: 'from-emerald-500/10 to-emerald-500/5 text-emerald-700',
    cyan: 'from-cyan-500/10 to-cyan-500/5 text-cyan-700',
    rose: 'from-rose-500/10 to-rose-500/5 text-rose-700',
    amber: 'from-amber-500/10 to-amber-500/5 text-amber-700',
    indigo: 'from-indigo-500/10 to-indigo-500/5 text-indigo-700',
    violet: 'from-violet-500/10 to-violet-500/5 text-violet-700',
  } as const;

  return (
    <div className={clsx('rounded-lg border border-slate-200 bg-gradient-to-br p-4 shadow-sm', accentClasses[accent])}>
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-slate-900">{value}</p>
    </div>
  );
}

export default App;
