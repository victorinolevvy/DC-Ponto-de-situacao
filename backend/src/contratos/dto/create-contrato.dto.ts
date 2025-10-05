import { ApiProperty } from '@nestjs/swagger';
import { TipoContrato } from '@prisma/client';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
} from 'class-validator';

export class CreateContratoDto {
  @ApiProperty({ enum: TipoContrato, example: TipoContrato.Civil })
  @IsEnum(TipoContrato)
  tipoContrato: TipoContrato;

  @ApiProperty({ example: 'Construtora Atlântico' })
  @IsString()
  @IsNotEmpty()
  empresa: string;

  @ApiProperty({ example: 45000000, required: false })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  valorContratoMT?: number;

  @ApiProperty({ example: '2024-02-01', required: false })
  @IsOptional()
  @IsDateString()
  dataInicio?: string;

  @ApiProperty({ example: '2024-12-15', required: false })
  @IsOptional()
  @IsDateString()
  dataPrevistaFim?: string;

  @ApiProperty({ example: true, required: false, default: false })
  @IsOptional()
  @IsBoolean()
  chaveNaMao?: boolean;
}
