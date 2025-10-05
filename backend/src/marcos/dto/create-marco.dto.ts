import { ApiProperty } from '@nestjs/swagger';
import { TipoMarco } from '@prisma/client';
import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateMarcoDto {
  @ApiProperty({ enum: TipoMarco, example: TipoMarco.Consignacao })
  @IsEnum(TipoMarco)
  tipo: TipoMarco;

  @ApiProperty({ example: '2024-08-22' })
  @IsDateString()
  data: string;

  @ApiProperty({ example: 'Vistoria intermédia', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  nota?: string;
}
