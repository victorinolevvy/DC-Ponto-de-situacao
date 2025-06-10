const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const multer = require('multer');
const xlsx = require('xlsx');
const fs = require('fs');

const app = express();
const upload = multer({ dest: 'uploads/' });
const db = new sqlite3.Database('database.sqlite');

app.use(cors());
app.use(express.json());

// create table if not exists
const initSql = `CREATE TABLE IF NOT EXISTS projects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  provincia TEXT,
  pesoe TEXT,
  pa TEXT,
  objecto TEXT,
  empresa_contratada TEXT,
  valor_contrato REAL,
  data_inicio TEXT,
  valor_pago REAL,
  valor_falta REAL,
  fis INTEGER,
  fin INTEGER,
  previsao_termino TEXT,
  ponto_situacao TEXT,
  gestor TEXT,
  estado TEXT,
  desvio TEXT
)`;

db.serialize(() => {
  db.run(initSql);
  db.all("PRAGMA table_info(projects)", (err, rows) => {
    if (err) return console.error(err);
    if (!rows.some(r => r.name === 'estado')) {
      db.run('ALTER TABLE projects ADD COLUMN estado TEXT');
    }
  });
});

app.get('/projects', (req, res) => {
  const { provincia, gestor, objecto, estado } = req.query;
  let sql = 'SELECT * FROM projects WHERE 1=1';
  const params = [];
  if (provincia) {
    sql += ' AND provincia LIKE ?';
    params.push(`%${provincia}%`);
  }
  if (gestor) {
    sql += ' AND gestor LIKE ?';
    params.push(`%${gestor}%`);
  }
  if (objecto) {
    sql += ' AND objecto LIKE ?';
    params.push(`%${objecto}%`);
  }
  if (estado) {
    sql += ' AND estado LIKE ?';
    params.push(`%${estado}%`);
  }
  db.all(sql, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post('/projects', (req, res) => {
  const p = req.body;
  const sql = `INSERT INTO projects (
    provincia, pesoe, pa, objecto, empresa_contratada, valor_contrato,
    data_inicio, valor_pago, valor_falta, fis, fin, previsao_termino,
    ponto_situacao, gestor, estado, desvio
  ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`;
  const params = [p.provincia, p.pesoe, p.pa, p.objecto, p.empresa_contratada,
    p.valor_contrato, p.data_inicio, p.valor_pago, p.valor_falta, p.fis, p.fin,
    p.previsao_termino, p.ponto_situacao, p.gestor, p.estado, p.desvio];
  db.run(sql, params, function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ id: this.lastID });
  });
});

app.put('/projects/:id', (req, res) => {
  const p = req.body;
  const sql = `UPDATE projects SET provincia=?, pesoe=?, pa=?, objecto=?, empresa_contratada=?, valor_contrato=?, data_inicio=?, valor_pago=?, valor_falta=?, fis=?, fin=?, previsao_termino=?, ponto_situacao=?, gestor=?, estado=?, desvio=? WHERE id=?`;
  const params = [p.provincia, p.pesoe, p.pa, p.objecto, p.empresa_contratada,
    p.valor_contrato, p.data_inicio, p.valor_pago, p.valor_falta, p.fis, p.fin,
    p.previsao_termino, p.ponto_situacao, p.gestor, p.estado, p.desvio, req.params.id];
  db.run(sql, params, function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ changes: this.changes });
  });
});

app.get('/export', (req, res) => {
  db.all('SELECT * FROM projects', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    const ws = xlsx.utils.json_to_sheet(rows);
    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, 'Projects');
    const file = 'export.xlsx';
    xlsx.writeFile(wb, file);
    res.download(file, 'projects.xlsx', (e) => {
      if (e) console.error(e);
      fs.unlinkSync(file);
    });
  });
});

app.get('/export/csv', (req, res) => {
  db.all('SELECT * FROM projects', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    const ws = xlsx.utils.json_to_sheet(rows);
    const csv = xlsx.utils.sheet_to_csv(ws);
    res.header('Content-Type', 'text/csv');
    res.attachment('projects.csv');
    res.send(csv);
  });
});

app.post('/import', upload.single('file'), (req, res) => {
  const filePath = req.file.path;
  const workbook = xlsx.readFile(filePath);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const data = xlsx.utils.sheet_to_json(sheet);
  const insertSql = `INSERT INTO projects (
    provincia, pesoe, pa, objecto, empresa_contratada, valor_contrato,
    data_inicio, valor_pago, valor_falta, fis, fin, previsao_termino,
    ponto_situacao, gestor, estado, desvio
  ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`;
  const stmt = db.prepare(insertSql);
  db.serialize(() => {
    data.forEach(p => {
      stmt.run([
        p.provincia, p.pesoe, p.pa, p.objecto, p.empresa_contratada,
        p.valor_contrato, p.data_inicio, p.valor_pago, p.valor_falta,
        p.fis, p.fin, p.previsao_termino, p.ponto_situacao, p.gestor, p.estado, p.desvio
      ]);
    });
    stmt.finalize();
    fs.unlinkSync(filePath);
    res.json({ imported: data.length });
  });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log('Server running on port ' + PORT);
});

