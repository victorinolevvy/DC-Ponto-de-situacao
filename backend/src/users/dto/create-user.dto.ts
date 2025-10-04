import { Perfil } from '@prisma/client';

export interface CreateUserInput {
  nome: string;
  email: string;
  perfil: Perfil;
  hashSenha: string;
}
