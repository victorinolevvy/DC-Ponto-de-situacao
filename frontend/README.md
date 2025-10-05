# Frontend – Dashboard Consolidado

Aplicação React + Vite + Tailwind responsável por consumir o endpoint `/dashboard/overview`, visualizar mapa/tabela e exportar PDF/Excel.

## Pré-requisitos

- Node.js >= 20
- npm >= 10
- Backend a correr em `http://localhost:3001` (ou ajustar `VITE_API_URL`)

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

- Copie `VITE_API_URL` para um ficheiro `.env` (ex.: `VITE_API_URL=http://localhost:3001`). Caso não seja definido, é usado `http://localhost:3001` por defeito.
- Utilize o cartão “Token JWT” no topo do dashboard para armazenar o `accessToken` obtido via `POST /auth/login`.

## Funcionalidades

- KPIs globais (investimento, estados, riscos, média de execução física)
- Tabela consolidada com filtros, ordenação e paginação
- Mapa Leaflet com semáforo definitivo e motivos detalhados
- Exportação backend-driven para Excel (`.xlsx`) ou PDF (`.pdf`)
