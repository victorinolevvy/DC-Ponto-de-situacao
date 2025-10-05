import { Injectable } from '@nestjs/common';
import { Perfil } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserInput } from './dto/create-user.dto';

export interface SafeUser {
  id: number;
  nome: string;
  email: string;
  perfil: Perfil;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateUserInput): Promise<SafeUser> {
    const user = await this.prisma.utilizador.create({ data });
    return this.toSafe(user);
  }

  async findByEmail(email: string) {
    return this.prisma.utilizador.findUnique({ where: { email } });
  }

  async findById(id: number): Promise<SafeUser | null> {
    const user = await this.prisma.utilizador.findUnique({ where: { id } });
    return user ? this.toSafe(user) : null;
  }

  toSafe(user: {
    id: number;
    nome: string;
    email: string;
    perfil: Perfil;
    createdAt: Date;
    updatedAt: Date;
  }) {
    const { id, nome, email, perfil, createdAt, updatedAt } = user;
    return { id, nome, email, perfil, createdAt, updatedAt };
  }
}
