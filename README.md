# DC – Ponto de Situação

Monorepositório para o MVP de reporte quinzenal dos projectos de electrificação rural.

## Estrutura

```
.
├── backend/   # API NestJS + Prisma + PostgreSQL
├── frontend/  # SPA React/TypeScript (Vite + Tailwind) para o dashboard consolidado
└── docker-compose.yml  # Postgres local para desenvolvimento
```

## Scripts principais

Na raiz do repositório existem scripts que orquestram os ambientes mais comuns:

- `npm run dev:stack` – sobe Postgres + backend (com migrations e seeds automáticas) via Docker Compose.
- `npm run dev:demo` – modo "demo" sem Docker, utilizando SQLite in-file, arrancando backend e frontend em paralelo.
- `npm run dev:fe` – apenas o frontend Vite em modo desenvolvimento.
- `npm run seed:dev` – repõe as seeds idempotentes (utilizadores demo, localização e projectos exemplificativos).
- `npm run dev:stack:down` – encerra o stack Docker.

As credenciais de demonstração permanecem:

- `admin@demo` / `Senha123!`
- `director@demo` / `Senha123!`
- `gestor@demo` / `Senha123!`

## Execução com Docker Compose

```bash
npm run dev:stack
```

O comando aguarda o Postgres (`postgres:15`), aplica migrations (`prisma migrate deploy`), executa `seed:dev` e arranca o backend em modo watch. A API fica disponível em `http://localhost:3000/api` com Swagger em `http://localhost:3000/docs`. Um Adminer opcional está exposto em `http://localhost:8080`.

### Frontend durante o stack Docker

O frontend continua a ser executado fora do Compose para hot reload imediato:

```bash
npm run dev:fe
```

Certifica-te de copiar os `.env.example` para `.env` em `backend/` e `frontend/` caso precises de ajustar URLs ou segredos.

## Modo "demo" sem Docker

Para uma experiência rápida sem containerização, utiliza o SQLite embutido:

```bash
npm run dev:demo
```

O script define `DATABASE_URL=file:./dev.db`, gera o client Prisma, aplica migrations, executa seeds e arranca backend (`http://localhost:3000/api`) + frontend (`http://localhost:5173`).

## Integração Contínua e screenshots

O workflow [`ci.yml`](.github/workflows/ci.yml) executa lint + testes e2e, build do frontend/backend e captura duas screenshots automáticas com Playwright:

- `artifacts/dashboard-home.png`
- `artifacts/dashboard-projeto.png`

As imagens são carregadas como artefactos do GitHub Actions para validação visual da dashboard e da vista de detalhe.

## Documentação adicional

- [README do backend](backend/README.md) – configuração detalhada, variáveis de ambiente e endpoints.
- [README do frontend](frontend/README.md) – comandos Vite/Tailwind e configuração `VITE_API_URL`.
- [ADR-001](docs/ADR-001.md) – decisões técnicas sobre stack, semáforo e trade-offs.

## Licença

Projecto interno – uso restrito à equipa DCF.
