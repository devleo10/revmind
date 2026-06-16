const path = require('path');
const os = require('os');

const testDbPath = path.join(
  os.tmpdir(),
  `novabite-test-${process.pid}-${Date.now()}.db`,
);

process.env.DATABASE_PATH = testDbPath;
process.env.NODE_ENV = 'test';

module.exports = { testDbPath };
