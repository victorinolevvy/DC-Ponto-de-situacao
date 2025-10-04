import { ApiProperty } from '@nestjs/swagger';
import { Perfil } from '@prisma/client';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsString,
  MinLength,
} from 'class-validator';

export class RegisterDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  nome: string;

  @ApiProperty({ example: 'novo@demo' })
  @IsEmail({ require_tld: false }, { message: 'E-mail inválido' })
  email: string;

  @ApiProperty({ enum: Perfil, default: Perfil.Gestor })
  @IsEnum(Perfil)
  perfil: Perfil;

  @ApiProperty({ minLength: 6 })
  @IsString()
  @MinLength(6)
  senha: string;
}
