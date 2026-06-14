const { getDb } = require('../db');

const TOTALS_QUERY = `
  SELECT
    SUM(net_revenue_usd) AS total_net_revenue,
    SUM(units_sold) AS total_units,
    SUM(gross_profit_usd) AS total_gross_profit
  FROM transactions
`;

const TOP_REGION_QUERY = `
  SELECT region AS name, SUM(net_revenue_usd) AS net_revenue
  FROM transactions
  GROUP BY region
  ORDER BY net_revenue DESC
  LIMIT 1
`;

const TOP_CHANNEL_QUERY = `
  SELECT channel AS name, SUM(net_revenue_usd) AS net_revenue
  FROM transactions
  GROUP BY channel
  ORDER BY net_revenue DESC
  LIMIT 1
`;

const TOP_PRODUCT_QUERY = `
  SELECT
    sku,
    product_name,
    SUM(net_revenue_usd) AS net_revenue
  FROM transactions
  GROUP BY sku, product_name
  ORDER BY net_revenue DESC
  LIMIT 1
`;

function getSummary() {
  const db = getDb();

  const totals = db.prepare(TOTALS_QUERY).get();
  const topRegion = db.prepare(TOP_REGION_QUERY).get();
  const topChannel = db.prepare(TOP_CHANNEL_QUERY).get();
  const topProduct = db.prepare(TOP_PRODUCT_QUERY).get();

  const grossProfitMarginPct =
    totals.total_net_revenue > 0
      ? (totals.total_gross_profit / totals.total_net_revenue) * 100
      : 0;

  return {
    total_net_revenue: totals.total_net_revenue,
    total_units: totals.total_units,
    gross_profit_margin_pct: Number(grossProfitMarginPct.toFixed(2)),
    top_region: topRegion,
    top_channel: topChannel,
    top_product: topProduct,
  };
}

module.exports = { getSummary };
