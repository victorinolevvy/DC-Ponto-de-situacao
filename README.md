# DC – Ponto de Situação

Monorepositório para o MVP de reporte quinzenal dos projectos de electrificação rural.

## Estrutura

```
.
├── backend/   # API NestJS + Prisma + PostgreSQL
├── frontend/  # SPA React/TypeScript (Vite + Tailwind) para o dashboard consolidado
└── docker-compose.yml  # Postgres local para desenvolvimento
```

## Iteração 1 – Entregue

- Bootstrap do backend com NestJS 11, Prisma e PostgreSQL
- Autenticação JWT com perfis (Gestor, Director, Admin)
- CRUD de localizações (províncias, distritos, postos administrativos)
- CRUD inicial de projectos
- Seeds com utilizadores demo e dados geográficos
- Documentação Swagger disponível em `/docs`
- Testes básicos de contrato (Supertest)

> Consulte o [README do backend](backend/README.md) para instruções detalhadas de configuração, scripts e endpoints.

## Iteração 5 – Dashboard consolidado (Entregue)

- Endpoint `/dashboard/overview` com KPIs, tabela paginada/ordenável e partilha da lógica de semáforo definitivo.
- Exportação para Excel e PDF gerada no backend reutilizando os filtros aplicados.
- Frontend em React (Vite) com mapa Leaflet, tabela filtrável e gestão de token JWT.

> Consulte o [README do frontend](frontend/README.md) para execução local e variáveis `VITE_`.

## Como executar rapidamente o backend

```bash
cd backend
npm install
cp .env.example .env
# a partir da raiz do repositório
cd ..
docker-compose up -d
cd backend
npm run prisma:migrate
npm run seed:dev
npm run start:dev
```

Aplicação disponível em `http://localhost:3000` (Swagger em `/docs`).

Credenciais seed:

- `admin@demo` / `Senha123!`
- `director@demo` / `Senha123!`
- `gestor@demo` / `Senha123!`

## Como executar rapidamente o frontend

```bash
cd frontend
npm install
cp .env.example .env  # ajustar VITE_API_URL caso necessário
npm run dev
```

Aplicação disponível em `http://localhost:5173`.

## Próximos Passos

1. Iteração 6 – Exportações enriquecidas e polimento UI/UX
2. Iteração 7 – Hardening (testes adicionais, acessibilidade, performance)

## Licença

Projecto interno – uso restrito à equipa DCF.
