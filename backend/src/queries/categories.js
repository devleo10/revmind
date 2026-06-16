const { getDb } = require('../db');

const CATEGORY_REVENUE_QUERY = `
  SELECT
    category,
    SUM(net_revenue_usd) AS net_revenue,
    SUM(units_sold) AS units
  FROM transactions
  GROUP BY category
  ORDER BY net_revenue DESC
`;

function getCategoryRevenue() {
  return getDb().prepare(CATEGORY_REVENUE_QUERY).all();
}

module.exports = { getCategoryRevenue };
