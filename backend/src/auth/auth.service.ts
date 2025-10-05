import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async validateUser({ email, senha }: LoginDto) {
    const user = await this.usersService.findByEmail(email.toLowerCase());
    if (!user) {
      throw new UnauthorizedException('Credenciais inválidas.');
    }

    const isValid = await bcrypt.compare(senha, user.hashSenha);
    if (!isValid) {
      throw new UnauthorizedException('Credenciais inválidas.');
    }

    return this.usersService.toSafe(user);
  }

  async login(dto: LoginDto) {
    const user = await this.validateUser(dto);
    const payload = { sub: user.id, email: user.email, perfil: user.perfil };
    const expiresIn = this.configService.get<string>('JWT_EXPIRES_IN', '3600s');

    return {
      success: true,
      data: {
        accessToken: await this.jwtService.signAsync(payload, {
          expiresIn,
        }),
        user,
      },
    };
  }

  async register(dto: RegisterDto) {
    const existing = await this.usersService.findByEmail(
      dto.email.toLowerCase(),
    );
    if (existing) {
      throw new UnauthorizedException('E-mail já registado.');
    }

    const hashSenha = await bcrypt.hash(dto.senha, 10);
    const user = await this.usersService.create({
      nome: dto.nome,
      email: dto.email.toLowerCase(),
      perfil: dto.perfil,
      hashSenha,
    });

    return user;
  }
}
