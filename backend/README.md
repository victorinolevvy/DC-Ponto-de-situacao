# Backend – Ponto de Situação Quinzenal

API construída com [NestJS](https://nestjs.com/) + [Prisma](https://www.prisma.io/) para suportar o MVP de reporte dos projectos de electrificação rural.

## Requisitos

- Node.js >= 20
- npm >= 10
- Docker (opcional, utilizado para a base de dados via `docker compose`)

## Configuração inicial

1. Copie o ficheiro `.env.example` para `.env` e ajuste as variáveis conforme o seu ambiente.
2. Instale as dependências:
   ```bash
   npm install
   ```
3. (Opcional) Levante a base de dados local via Docker a partir da raiz do repositório:
   ```bash
   npm run dev:stack
   ```
   Este comando aguarda o Postgres ficar saudável, aplica `prisma migrate deploy`, corre as seeds e arranca o backend em modo watch dentro do container.
4. Ajuste as variáveis de ambiente conforme necessário:
   - `DATABASE_URL` – se não for definido, o Prisma recorre a `file:./dev.db` (SQLite) para um modo "demo" local.
   - `CORS_ORIGIN` – origens permitidas para o frontend (ex.: `http://localhost:5173`).
   - `THROTTLE_TTL_MS` / `THROTTLE_LIMIT` – parâmetros do rate limiting global.
   - `RELATORIOS_TOLERANCIA_FUTURO_DIAS` – tolerância máxima para `dataRef` futura (padrão `3`).
5. Execute as migrações e gere o cliente Prisma para desenvolvimento local:
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
| `npm run prisma:migrate:deploy` | Aplica migrações existentes sem gerar novas (utilizado em CI/Docker). |
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

## Endpoints principais (Iteração 5)

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
- `GET /dashboard/overview` – devolve KPIs globais e lista consolidada de projectos com filtros/paginação.
- `GET /dashboard/overview/export?format=xlsx|pdf` – gera ficheiro com os mesmos filtros aplicados na listagem.

Todas as respostas seguem o formato `{ success: boolean, data?: any, error?: { message, statusCode } }`.

A documentação interactiva está disponível em `/docs` (Swagger) depois de iniciar a aplicação.

## Dashboard consolidado e exportações

- Os KPIs incluídos são: nº de projectos em curso/concluídos/parados, investimento total (somatório `valorGlobalMT`), média de execução física dos últimos relatórios e nº de riscos activos (texto preenchido).
- A lista consolidada inclui: identificação, localização, tipo, percentagens de execução, estado de prazo, valor total dos contratos, semáforo definitivo com motivos, risco completo e última actualização.
- Filtros suportados: `provinciaId`, `tipoProjeto`, `estado` + ordenação (`sortBy`, `sortOrder`) e paginação (`page`, `pageSize`).
- As exportações replicam exactamente os filtros seleccionados, incluem cabeçalhos com filtros/data e estão disponíveis em Excel (`.xlsx`) e PDF (com cabeçalho/rodapé).

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
# ou utilise o modo rápido com SQLite: DATABASE_URL=file:./dev.db npm run dev:demo (a partir da raiz)
# abrir http://localhost:3000/docs
```

## Reset do ambiente local

```bash
npm run reset:dev
```

Este comando elimina os dados e reaplica o seed inicial.
