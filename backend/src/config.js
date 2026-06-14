const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const defaultCorsOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:3000',
];

const config = {
  port: Number(process.env.PORT) || 3001,
  nodeEnv: process.env.NODE_ENV || 'development',
  corsOrigins: process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(',').map((origin) => origin.trim())
    : defaultCorsOrigins,
  databasePath: process.env.DATABASE_PATH
    ? path.isAbsolute(process.env.DATABASE_PATH)
      ? process.env.DATABASE_PATH
      : path.resolve(process.cwd(), process.env.DATABASE_PATH)
    : path.resolve(__dirname, '../../data/novabite.db'),
  openaiApiKey: process.env.OPENAI_API_KEY || '',
};

module.exports = config;
