import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsString } from 'class-validator';

export class CreateDistritoDto {
  @ApiProperty({ example: 'Boane' })
  @IsString()
  @IsNotEmpty()
  nome: string;

  @ApiProperty({ example: 1 })
  @IsInt()
  provinciaId: number;
}
