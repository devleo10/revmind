const express = require('express');
const cors = require('cors');
const config = require('./config');
const { seed } = require('../seed');
const { getDb } = require('./db');
const productsRouter = require('./routes/products');
const summaryRouter = require('./routes/summary');

const app = express();

app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => {
  const rowCount = getDb()
    .prepare('SELECT COUNT(*) AS count FROM transactions')
    .get().count;

  res.json({ status: 'ok', transactions: rowCount });
});

app.get('/', (_req, res) => {
  res.json({ status: 'ok', service: 'novabite-api' });
});

app.use('/api/products', productsRouter);
app.use('/api/summary', summaryRouter);

seed();

app.listen(config.port, () => {
  console.log(`Server listening on http://localhost:${config.port}`);
});
