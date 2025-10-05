import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'gestor@demo' })
  @IsEmail({ require_tld: false }, { message: 'E-mail inválido' })
  email: string;

  @ApiProperty({ minLength: 6 })
  @IsString()
  @MinLength(6)
  senha: string;
}
