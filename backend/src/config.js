const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const config = {
  port: Number(process.env.PORT) || 3001,
  nodeEnv: process.env.NODE_ENV || 'development',
  databasePath:
    process.env.DATABASE_PATH ||
    path.resolve(__dirname, '../../data/novabite.db'),
  openaiApiKey: process.env.OPENAI_API_KEY || '',
};

module.exports = config;
