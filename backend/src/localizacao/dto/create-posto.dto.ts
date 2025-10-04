import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsString } from 'class-validator';

export class CreatePostoDto {
  @ApiProperty({ example: 'Boane Sede' })
  @IsString()
  @IsNotEmpty()
  nome: string;

  @ApiProperty({ example: 1 })
  @IsInt()
  distritoId: number;
}
