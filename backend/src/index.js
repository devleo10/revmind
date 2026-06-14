const express = require('express');
const cors = require('cors');
const config = require('./config');
const { seed } = require('../seed');
const { getDb } = require('./db');
const productsRouter = require('./routes/products');
const summaryRouter = require('./routes/summary');
const trendsRouter = require('./routes/trends');
const chatRouter = require('./routes/chat');
const notFound = require('./middleware/notFound');
const errorHandler = require('./middleware/errorHandler');
const { sendSuccess } = require('./utils/apiResponse');

const app = express();

app.use(
  cors({
    origin: config.corsOrigins,
  }),
);
app.use(express.json());

app.get('/health', (_req, res) => {
  const rowCount = getDb()
    .prepare('SELECT COUNT(*) AS count FROM transactions')
    .get().count;

  sendSuccess(res, { status: 'ok', transactions: rowCount });
});

app.get('/', (_req, res) => {
  sendSuccess(res, { status: 'ok', service: 'novabite-api' });
});

app.use('/api/products', productsRouter);
app.use('/api/summary', summaryRouter);
app.use('/api/trends', trendsRouter);
app.use('/api/chat', chatRouter);

app.use(notFound);
app.use(errorHandler);

seed();

app.listen(config.port, () => {
  console.log(`Server listening on http://localhost:${config.port}`);
});
