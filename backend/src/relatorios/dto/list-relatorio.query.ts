import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  Matches,
  Max,
  Min,
} from 'class-validator';

export class ListRelatorioQueryDto {
  @ApiPropertyOptional({
    description: 'Data inicial (inclusive) para filtro.',
    example: '2024-02-01',
  })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({
    description: 'Data final (inclusive) para filtro.',
    example: '2024-04-01',
  })
  @IsOptional()
  @IsDateString()
  to?: string;

  @ApiPropertyOptional({
    description: 'Filtrar por contrato específico.',
    example: 3,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  contratoId?: number;

  @ApiPropertyOptional({
    description: 'Página (inicia em 1).',
    example: 1,
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @ApiPropertyOptional({
    description: 'Tamanho da página (máx. 50).',
    example: 10,
    default: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  pageSize = 10;

  @ApiPropertyOptional({
    description: 'Campo de ordenação. Aceita `dataRef:asc` ou `dataRef:desc`.',
    example: 'dataRef:desc',
    default: 'dataRef:desc',
  })
  @IsOptional()
  @Matches(/^dataRef:(asc|desc)$/i)
  sort?: string;
}

export class EvolucaoQueryDto {
  @ApiPropertyOptional({
    description: 'Métrica alvo (execução física ou financeira).',
    enum: ['fisica', 'financeira'],
    default: 'fisica',
  })
  @IsOptional()
  @IsIn(['fisica', 'financeira'])
  metric: 'fisica' | 'financeira' = 'fisica';

  @ApiPropertyOptional({
    description: 'Filtrar série temporal por contrato específico.',
    example: 2,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  contratoId?: number;
}
