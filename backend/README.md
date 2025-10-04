# Backend – Ponto de Situação Quinzenal

API construída com [NestJS](https://nestjs.com/) + [Prisma](https://www.prisma.io/) para suportar o MVP de reporte dos projectos de electrificação rural.

## Requisitos

- Node.js >= 20
- npm >= 10
- Docker (opcional, utilizado para a base de dados via `docker-compose`)

## Configuração inicial

1. Copie o ficheiro `.env.example` para `.env` e ajuste as variáveis conforme o seu ambiente.
2. Instale as dependências:
   ```bash
   npm install
   ```
3. (Opcional) Levante a base de dados local via Docker a partir da raiz do repositório:
   ```bash
   docker-compose up -d
   ```
4. (Opcional) Ajuste a tolerância máxima para datas futuras dos relatórios quinzenais através da variável `RELATORIOS_TOLERANCIA_FUTURO_DIAS` (padrão `3`).
5. Execute as migrações e gere o cliente Prisma:
   ```bash
   npm run prisma:migrate
   ```
6. Carregue os dados seed (utilizadores, localizações e projectos demo):
   ```bash
   npm run seed:dev
   ```

## Scripts úteis

| Comando | Descrição |
| --- | --- |
| `npm run start:dev` | Inicia o servidor em modo watch (porta definida em `PORT`, padrão `3000`). |
| `npm run start` | Inicia o servidor em modo produção. |
| `npm run prisma:migrate` | Executa migrações (`prisma migrate dev`). |
| `npm run prisma:generate` | Gera o cliente Prisma. |
| `npm run seed:dev` | Corre o script de seed configurado em `prisma/seed.ts`. |
| `npm run reset:dev` | Reinicia a BD (`prisma migrate reset --seed`). |
| `npm run lint` | Corre o ESLint. |
| `npm run test` | Testes unitários. |
| `npm run test:e2e` | Testes de contrato com Supertest/Jest. |

## Autenticação e Perfis

O seed cria três contas:

| Perfil | E-mail | Senha |
| --- | --- | --- |
| Admin | `admin@demo` | `Senha123!` |
| Director | `director@demo` | `Senha123!` |
| Gestor | `gestor@demo` | `Senha123!` |

- `POST /auth/login` devolve um `accessToken` JWT e os metadados do utilizador.
- `POST /auth/register` exige perfil `Admin` e cria novos utilizadores.

## Endpoints principais (Iteração 4)

- `GET /provincias`, `POST /provincias`, `PATCH /provincias/:id`, `DELETE /provincias/:id`
- `GET /distritos?provinciaId=`, `POST /distritos`, `PATCH /distritos/:id`, `DELETE /distritos/:id`
- `GET /postos?distritoId=`, `POST /postos`, `PATCH /postos/:id`, `DELETE /postos/:id`
- `GET /projetos`, `GET /projetos/:id`, `POST /projetos`, `PATCH /projetos/:id`
- `GET /projetos/:id/resumo` – inclui cálculo do semáforo definitivo e motivos detalhados.
- `GET /projetos/:id/relatorios`, `POST /projetos/:id/relatorios`, `PATCH /relatorios/:id`, `GET /relatorios/:id`, `DELETE /relatorios/:id`
- `GET /projetos/:id/evolucao?metric=fisica|financeira`
- `GET /projetos/:id/ultima-quinzena`
- `GET /projetos/:id/contratos`, `POST /projetos/:id/contratos`, `PATCH /contratos/:id`
- `GET /projetos/:id/marcos`, `POST /projetos/:id/marcos`
- `POST /auth/login`, `POST /auth/register`, `GET /auth/profile`

Todas as respostas seguem o formato `{ success: boolean, data?: any, error?: { message, statusCode } }`.

A documentação interactiva está disponível em `/docs` (Swagger) depois de iniciar a aplicação.

## Qualidade

- ESLint + Prettier configurados com Husky (`pre-commit` executa `lint-staged`).
- Logger estruturado com `nestjs-pino`.
- Rate limiting global (`@nestjs/throttler`) e reforço de limites nos endpoints de relatórios.
- Validação de entrada com `class-validator`/`class-transformer`.

## Fluxo típico de desenvolvimento

```bash
npm install
npm run prisma:migrate
npm run seed:dev
npm run start:dev
# abrir http://localhost:3000/docs
```

## Reset do ambiente local

```bash
npm run reset:dev
```

Este comando elimina os dados e reaplica o seed inicial.
