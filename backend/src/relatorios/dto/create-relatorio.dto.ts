import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PrazoStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateRelatorioDto {
  @ApiProperty({
    description: 'Data de referência do relatório quinzenal.',
    example: '2024-03-15',
  })
  @IsDateString()
  dataRef!: string;

  @ApiPropertyOptional({
    description: 'Identificador do contrato associado (opcional).',
    example: 2,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  contratoId?: number;

  @ApiProperty({
    description: 'Percentagem de execução física (0-100).',
    example: 48.5,
  })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  execFisicaPct!: number;

  @ApiProperty({
    description: 'Percentagem de execução financeira (0-100).',
    example: 52.3,
  })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  execFinanceiraPct!: number;

  @ApiProperty({
    description: 'Estado do prazo à data do relatório.',
    enum: PrazoStatus,
    example: PrazoStatus.NO_PRAZO,
  })
  @IsEnum(PrazoStatus)
  prazo!: PrazoStatus;

  @ApiPropertyOptional({
    description: 'Descrição do risco identificado para o período.',
    example: 'Risco de atraso na entrega de equipamentos.',
    maxLength: 2000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  risco?: string;

  @ApiPropertyOptional({
    description: 'Medidas de mitigação propostas para o risco.',
    example: 'Contacto com fornecedor alternativo em curso.',
    maxLength: 2000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  mitigacao?: string;
}
