const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');
const { initDb, getDb, closeDb, resolveDatabasePath } = require('./src/db');
const { TRANSACTIONS_TABLE, EXPECTED_ROW_COUNT } = require('./src/db/schema');

const CSV_PATH = path.resolve(__dirname, '../data/novabite_sales_data.csv');

const INSERT_TRANSACTION = `
INSERT INTO transactions (
  transaction_id,
  date,
  month,
  quarter,
  sku,
  product_name,
  category,
  subcategory,
  region,
  channel,
  sales_rep,
  units_sold,
  unit_price_usd,
  gross_revenue_usd,
  discount_pct,
  net_revenue_usd,
  cogs_usd,
  gross_profit_usd
) VALUES (
  @transaction_id,
  @date,
  @month,
  @quarter,
  @sku,
  @product_name,
  @category,
  @subcategory,
  @region,
  @channel,
  @sales_rep,
  @units_sold,
  @unit_price_usd,
  @gross_revenue_usd,
  @discount_pct,
  @net_revenue_usd,
  @cogs_usd,
  @gross_profit_usd
);
`;

function getTransactionCount(database) {
  const row = database.prepare('SELECT COUNT(*) AS count FROM transactions').get();
  return row.count;
}

function isAlreadySeeded(database) {
  return getTransactionCount(database) === EXPECTED_ROW_COUNT;
}

function createSchema(database) {
  database.exec(TRANSACTIONS_TABLE);
}

function resetTransactions(database) {
  database.exec('DROP TABLE IF EXISTS transactions');
  createSchema(database);
}

function readCsvRows() {
  if (!fs.existsSync(CSV_PATH)) {
    throw new Error(`CSV file not found: ${CSV_PATH}`);
  }

  const csvContent = fs.readFileSync(CSV_PATH, 'utf8');
  const records = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });

  if (records.length !== EXPECTED_ROW_COUNT) {
    throw new Error(
      `Expected ${EXPECTED_ROW_COUNT} CSV rows, found ${records.length}`,
    );
  }

  return records.map((row) => ({
    transaction_id: row.transaction_id,
    date: row.date,
    month: row.month,
    quarter: row.quarter,
    sku: row.sku,
    product_name: row.product_name,
    category: row.category,
    subcategory: row.subcategory,
    region: row.region,
    channel: row.channel,
    sales_rep: row.sales_rep,
    units_sold: Number(row.units_sold),
    unit_price_usd: Number(row.unit_price_usd),
    gross_revenue_usd: Number(row.gross_revenue_usd),
    discount_pct: Number(row.discount_pct),
    net_revenue_usd: Number(row.net_revenue_usd),
    cogs_usd: Number(row.cogs_usd),
    gross_profit_usd: Number(row.gross_profit_usd),
  }));
}

function insertTransactions(database, rows) {
  const insert = database.prepare(INSERT_TRANSACTION);
  const insertMany = database.transaction((records) => {
    for (const record of records) {
      insert.run(record);
    }
  });

  insertMany(rows);
}

function seed({ force = false } = {}) {
  initDb();
  const database = getDb();

  createSchema(database);

  if (!force && isAlreadySeeded(database)) {
    console.log(
      `Database already seeded (${EXPECTED_ROW_COUNT} rows). Skipping.`,
    );
    return { seeded: false, rowCount: getTransactionCount(database) };
  }

  if (force) {
    resetTransactions(database);
  }

  const rows = readCsvRows();
  insertTransactions(database, rows);

  const rowCount = getTransactionCount(database);
  if (rowCount !== EXPECTED_ROW_COUNT) {
    throw new Error(`Seed failed: expected ${EXPECTED_ROW_COUNT} rows, got ${rowCount}`);
  }

  console.log(`Seeded ${rowCount} transactions into ${resolveDatabasePath()}`);
  return { seeded: true, rowCount };
}

if (require.main === module) {
  const force = process.argv.includes('--force');

  try {
    const result = seed({ force });
    console.log(`Row count: ${result.rowCount}`);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  } finally {
    closeDb();
  }
}

module.exports = { seed, EXPECTED_ROW_COUNT };
