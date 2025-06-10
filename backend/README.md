# Backend - Ponto de Situacao

Esta pasta contem a API Express utilizando SQLite.

## Dependencias

- express
- sqlite3
- cors
- multer
- xlsx

Instale com:

```bash
npm install
```

## Execucao

```bash
node server.js
```

O servidor inicia em `http://localhost:3001`.

## Filtros de consulta

O endpoint `/projects` aceita parametros de query para filtrar os resultados:

- `provincia`
- `gestor`
- `objecto`

Exemplo:

```bash
curl "http://localhost:3001/projects?provincia=Maputo&gestor=Ana"
```

## Importacao

Envie um `multipart/form-data` com o campo `file` para `/import` contendo um ficheiro Excel ou CSV.

## Exportacao

Acesse `/export` para baixar o ficheiro `projects.xlsx` com os dados.
