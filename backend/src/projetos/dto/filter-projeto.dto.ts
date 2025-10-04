import { ApiPropertyOptional } from '@nestjs/swagger';
import { EstadoProjeto, TipoProjeto } from '@prisma/client';
import { IsEnum, IsInt, IsOptional, IsString } from 'class-validator';

export class FilterProjetoDto {
  @ApiPropertyOptional({ enum: TipoProjeto })
  @IsOptional()
  @IsEnum(TipoProjeto)
  tipoProjeto?: TipoProjeto;

  @ApiPropertyOptional({ enum: EstadoProjeto })
  @IsOptional()
  @IsEnum(EstadoProjeto)
  estado?: EstadoProjeto;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsInt()
  provinciaId?: number;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsInt()
  distritoId?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;
}
