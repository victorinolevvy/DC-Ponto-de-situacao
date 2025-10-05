import { EstadoProjeto, TipoProjeto } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';

const SORTABLE_FIELDS = [
  'nome',
  'execFisicaPct',
  'execFinanceiraPct',
  'prazo',
  'valorTotalContratos',
  'ultimaAtualizacao',
  'statusSemaforo',
] as const;

export type SortableField = (typeof SORTABLE_FIELDS)[number];

export class DashboardOverviewQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  provinciaId?: number;

  @IsOptional()
  @IsEnum(TipoProjeto)
  tipoProjeto?: TipoProjeto;

  @IsOptional()
  @IsEnum(EstadoProjeto)
  estado?: EstadoProjeto;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  pageSize?: number = 10;

  @IsOptional()
  @IsIn(SORTABLE_FIELDS)
  sortBy?: SortableField;

  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc';
}

export class DashboardExportQueryDto extends DashboardOverviewQueryDto {
  @IsIn(['xlsx', 'pdf'])
  format!: 'xlsx' | 'pdf';
}
