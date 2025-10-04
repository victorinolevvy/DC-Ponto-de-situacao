# DC – Ponto de Situação

Monorepositório para o MVP de reporte quinzenal dos projectos de electrificação rural.

## Estrutura

```
.
├── backend/   # API NestJS + Prisma + PostgreSQL
├── frontend/  # (placeholder) SPA React/TypeScript – a desenvolver nas próximas iterações
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

## Próximos Passos

1. Iteração 2 – CRUD de localização no frontend e operações de projectos
2. Iteração 3 – Contratos e marcos
3. Iteração 4 – Relatórios quinzenais e histórico

## Licença

Projecto interno – uso restrito à equipa DCF.
