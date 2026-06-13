const express = require('express');
const cors = require('cors');
const config = require('./config');

const app = express();

app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.get('/', (_req, res) => {
  res.json({ status: 'ok', service: 'novabite-api' });
});

app.listen(config.port, () => {
  console.log(`Server listening on http://localhost:${config.port}`);
});
