import { ApiProperty } from '@nestjs/swagger';
import { EstadoProjeto, TipoProjeto } from '@prisma/client';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
} from 'class-validator';

export class CreateProjetoDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  nome: string;

  @ApiProperty({ enum: TipoProjeto })
  @IsEnum(TipoProjeto)
  tipoProjeto: TipoProjeto;

  @ApiProperty({ example: 1 })
  @IsInt()
  provinciaId: number;

  @ApiProperty({ example: 1, required: false })
  @IsOptional()
  @IsInt()
  distritoId?: number;

  @ApiProperty({ example: 1, required: false })
  @IsOptional()
  @IsInt()
  postoAdmId?: number;

  @ApiProperty({ default: false, required: false })
  @IsOptional()
  @IsBoolean()
  chaveNaMao?: boolean;

  @ApiProperty({ example: -25.97, required: false })
  @IsOptional()
  @IsNumber()
  latitude?: number;

  @ApiProperty({ example: 32.58, required: false })
  @IsOptional()
  @IsNumber()
  longitude?: number;

  @ApiProperty({
    enum: EstadoProjeto,
    required: false,
    default: EstadoProjeto.EmCurso,
  })
  @IsOptional()
  @IsEnum(EstadoProjeto)
  estado?: EstadoProjeto;

  @ApiProperty({ example: 120000000, required: false })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  valorGlobalMT?: number;
}
