# Frontend – Dashboard Consolidado

Aplicação React + Vite + Tailwind responsável por consumir o endpoint `/dashboard/overview`, visualizar mapa/tabela e exportar PDF/Excel.

## Pré-requisitos

- Node.js >= 20
- npm >= 10
- Backend a correr em `http://localhost:3000/api` (ou ajustar `VITE_API_URL`)

## Comandos principais

```bash
npm install
npm run dev
```

O servidor arranca por omissão em `http://localhost:5173`.

```bash
npm run build
npm run preview
```

## Configuração

- Copie `VITE_API_URL` para um ficheiro `.env` (ex.: `VITE_API_URL=http://localhost:3000/api`). Caso não seja definido, é usado `http://localhost:3000/api` por defeito.
- Utilize o cartão “Token JWT” no topo do dashboard para armazenar o `accessToken` obtido via `POST /auth/login`.
- O script de raiz `npm run dev:demo` executa backend (SQLite) + frontend automaticamente, apontando o Vite para `http://localhost:3000/api`.

## Funcionalidades

- KPIs globais (investimento, estados, riscos, média de execução física) com filtros accionados por clique.
- Tabela consolidada com filtros, ordenação, paginação, tooltips dos motivos do semáforo e riscos truncados.
- Mapa Leaflet com semáforo definitivo, botão de acesso rápido ao detalhe e motivos detalhados.
- Painel de detalhe por projecto com resumo, riscos, contratos e próximas datas-chave.
- Exportação backend-driven para Excel (`.xlsx`) ou PDF (`.pdf`) reutilizando os filtros do dashboard.
