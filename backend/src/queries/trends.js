const { getDb } = require('../db');

const TRENDS_QUERY = `
  SELECT
    month,
    SUM(net_revenue_usd) AS net_revenue
  FROM transactions
  GROUP BY month
  ORDER BY month ASC
`;

function getTrends() {
  return getDb().prepare(TRENDS_QUERY).all();
}

module.exports = { getTrends };
