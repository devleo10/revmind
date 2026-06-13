const TRANSACTIONS_TABLE = `
CREATE TABLE IF NOT EXISTS transactions (
  transaction_id TEXT PRIMARY KEY,
  date TEXT NOT NULL,
  month TEXT NOT NULL,
  quarter TEXT NOT NULL,
  sku TEXT NOT NULL,
  product_name TEXT NOT NULL,
  category TEXT NOT NULL,
  subcategory TEXT NOT NULL,
  region TEXT NOT NULL,
  channel TEXT NOT NULL,
  sales_rep TEXT NOT NULL,
  units_sold INTEGER NOT NULL,
  unit_price_usd REAL NOT NULL,
  gross_revenue_usd REAL NOT NULL,
  discount_pct REAL NOT NULL,
  net_revenue_usd REAL NOT NULL,
  cogs_usd REAL NOT NULL,
  gross_profit_usd REAL NOT NULL
);
`;

const EXPECTED_ROW_COUNT = 1000;

module.exports = {
  TRANSACTIONS_TABLE,
  EXPECTED_ROW_COUNT,
};
