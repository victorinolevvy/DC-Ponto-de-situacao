import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CreateProvinciaDto {
  @ApiProperty({ example: 'Maputo' })
  @IsString()
  @IsNotEmpty()
  nome: string;
}
