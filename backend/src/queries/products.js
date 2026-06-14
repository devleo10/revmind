const { getDb } = require('../db');

const PRODUCTS_QUERY = `
  SELECT
    sku,
    product_name,
    SUM(net_revenue_usd) AS net_revenue,
    SUM(units_sold) AS units
  FROM transactions
  GROUP BY sku, product_name
  ORDER BY net_revenue DESC
`;

function getProducts() {
  return getDb().prepare(PRODUCTS_QUERY).all();
}

module.exports = { getProducts };
