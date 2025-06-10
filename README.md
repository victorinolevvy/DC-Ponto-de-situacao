# Ponto de Situação DCF

Aplicação simples para registo e actualização do ponto de situação dos projectos.

## Estrutura

- `backend/` – API Express com SQLite
- `frontend/` – Interface React simples

## Como executar

1. Entre na pasta `backend` e instale as dependências:
   ```bash
   npm install
   node server.js
   ```
   O servidor ficará disponível em `http://localhost:3001`.

2. Abra `frontend/index.html` em um navegador para utilizar a aplicação.

## Importar dados

Envie um ficheiro Excel para o endpoint `/import` usando ferramentas como cURL ou Postman:
```bash
curl -F file=@dados.xlsx http://localhost:3001/import
```

Acesse `/export` para baixar os dados em Excel.

### Filtrar resultados

Você pode passar parâmetros de query para `/projects` a fim de filtrar por
província, gestor ou objecto, por exemplo:

```bash
curl "http://localhost:3001/projects?provincia=Maputo&gestor=Ana"
```
