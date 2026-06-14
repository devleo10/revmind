const { getDb } = require('../db');
const { getSummary } = require('./summary');

const REGIONS = ['North', 'South', 'East', 'West', 'Central'];
const CATEGORIES = ['Personal Care', 'Snacks', 'Beverages', 'Home Care'];
const CHANNELS = [
  'Modern Trade',
  'General Trade',
  'E-Commerce',
  'Direct to Consumer',
];

function round(value, decimals = 2) {
  return Number(Number(value).toFixed(decimals));
}

function getRevenueByRegion({ quarter, year } = {}) {
  const conditions = [];
  const params = {};

  if (quarter) {
    conditions.push('quarter = @quarter');
    params.quarter = quarter;
  }

  if (year) {
    conditions.push("strftime('%Y', date) = @year");
    params.year = String(year);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  return getDb()
    .prepare(
      `
      SELECT
        region,
        SUM(net_revenue_usd) AS net_revenue,
        SUM(units_sold) AS units,
        SUM(gross_profit_usd) AS gross_profit
      FROM transactions
      ${whereClause}
      GROUP BY region
      ORDER BY net_revenue DESC
    `,
    )
    .all(params);
}

function getCategoryMetrics({ category } = {}) {
  const conditions = category ? 'WHERE category = @category' : '';
  const params = category ? { category } : {};

  const rows = getDb()
    .prepare(
      `
      SELECT
        category,
        SUM(net_revenue_usd) AS net_revenue,
        SUM(units_sold) AS units,
        SUM(gross_profit_usd) AS gross_profit
      FROM transactions
      ${conditions}
      GROUP BY category
      ORDER BY net_revenue DESC
    `,
    )
    .all(params);

  return rows.map((row) => ({
    ...row,
    gross_profit_margin_pct:
      row.net_revenue > 0
        ? round((row.gross_profit / row.net_revenue) * 100)
        : 0,
  }));
}

function getUnitsBySalesRep({ year } = {}) {
  const conditions = year ? "WHERE strftime('%Y', date) = @year" : '';
  const params = year ? { year: String(year) } : {};

  return getDb()
    .prepare(
      `
      SELECT
        sales_rep,
        SUM(units_sold) AS units,
        SUM(net_revenue_usd) AS net_revenue
      FROM transactions
      ${conditions}
      GROUP BY sales_rep
      ORDER BY units DESC
    `,
    )
    .all(params);
}

function getRevenueByChannel({ channels } = {}) {
  const conditions = [];
  const params = {};

  if (channels?.length) {
    const placeholders = channels.map((_, index) => `@channel${index}`).join(', ');
    conditions.push(`channel IN (${placeholders})`);
    channels.forEach((channel, index) => {
      params[`channel${index}`] = channel;
    });
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  return getDb()
    .prepare(
      `
      SELECT
        channel,
        SUM(net_revenue_usd) AS net_revenue,
        SUM(units_sold) AS units,
        SUM(gross_profit_usd) AS gross_profit
      FROM transactions
      ${whereClause}
      GROUP BY channel
      ORDER BY net_revenue DESC
    `,
    )
    .all(params);
}

function getTopProducts({ region, limit = 10 } = {}) {
  const conditions = region ? 'WHERE region = @region' : '';
  const params = region ? { region } : {};

  return getDb()
    .prepare(
      `
      SELECT
        sku,
        product_name,
        category,
        region,
        SUM(net_revenue_usd) AS net_revenue,
        SUM(units_sold) AS units,
        SUM(gross_profit_usd) AS gross_profit
      FROM transactions
      ${conditions}
      GROUP BY sku, product_name, category, region
      ORDER BY net_revenue DESC
      LIMIT ${limit}
    `,
    )
    .all(params);
}

function detectQuarter(question) {
  const match = question.match(/\bQ([1-4])\s*[- ]?\s*(2024|2025)\b/i);
  if (!match) {
    return null;
  }

  return `Q${match[1]}-${match[2]}`;
}

function detectYear(question) {
  const match = question.match(/\b(2024|2025)\b/);
  return match ? Number(match[1]) : null;
}

function detectRegions(question) {
  return REGIONS.filter((region) =>
    new RegExp(`\\b${region}\\b`, 'i').test(question),
  );
}

function detectCategories(question) {
  return CATEGORIES.filter((category) =>
    new RegExp(`\\b${category.replace(' ', '\\s+')}\\b`, 'i').test(question),
  );
}

function detectChannels(question) {
  return CHANNELS.filter((channel) =>
    new RegExp(`\\b${channel.replace(/[- ]/g, '[- ]')}\\b`, 'i').test(question),
  );
}

function analyzeQuestion(question) {
  const normalized = question.toLowerCase();

  return {
    quarter: detectQuarter(question),
    year: detectYear(question),
    regions: detectRegions(question),
    categories: detectCategories(question),
    channels: detectChannels(question),
    asksAboutReps:
      /\b(sales rep|sales representative|rep|representative)\b/i.test(question) ||
      /\bclosed\b.*\bunits\b/i.test(question) ||
      /\bmost units\b/i.test(question),
    asksAboutMargin:
      /\b(gross profit margin|profit margin|margin)\b/i.test(question),
    asksAboutProducts:
      /\b(product|sku|best performing|top product)\b/i.test(question),
    asksAboutRegions:
      /\b(region|regions)\b/i.test(question) ||
      /\bhighest\b.*\b(revenue|net revenue)\b/i.test(question),
    asksChannelComparison:
      /\b(compare|vs\.?|versus)\b/i.test(question) &&
      (/\b(channel|trade|commerce|e-commerce)\b/i.test(question) ||
        detectChannels(question).length >= 2),
    asksAboutChannels: /\b(channel|trade|commerce|e-commerce|dtc)\b/i.test(
      normalized,
    ),
  };
}

function buildChatContext(question) {
  const analysis = analyzeQuestion(question);
  const context = {
    global_summary: getSummary(),
  };

  const quarterFilter = analysis.quarter ? { quarter: analysis.quarter } : {};
  const yearFilter = analysis.year ? { year: analysis.year } : {};

  if (
    analysis.asksAboutRegions ||
    analysis.quarter ||
    analysis.regions.length > 0
  ) {
    context.revenue_by_region = getRevenueByRegion({
      ...quarterFilter,
      ...(analysis.year && !analysis.quarter ? yearFilter : {}),
    });
  }

  if (analysis.asksAboutMargin || analysis.categories.length > 0) {
    context.category_metrics = getCategoryMetrics(
      analysis.categories.length === 1
        ? { category: analysis.categories[0] }
        : {},
    );
  }

  if (analysis.asksAboutReps) {
    context.units_by_sales_rep = getUnitsBySalesRep(yearFilter);
  }

  if (
    analysis.asksChannelComparison ||
    analysis.asksAboutChannels ||
    analysis.channels.length > 0
  ) {
    context.revenue_by_channel = getRevenueByChannel({
      channels:
        analysis.channels.length > 0 ? analysis.channels : undefined,
    });
  }

  if (analysis.asksAboutProducts || analysis.regions.length > 0) {
    context.top_products = getTopProducts({
      region: analysis.regions.length === 1 ? analysis.regions[0] : undefined,
      limit: analysis.regions.length === 1 ? 5 : 10,
    });
  }

  if (Object.keys(context).length === 1) {
    context.revenue_by_region = getRevenueByRegion();
    context.category_metrics = getCategoryMetrics();
    context.revenue_by_channel = getRevenueByChannel();
    context.units_by_sales_rep = getUnitsBySalesRep();
    context.top_products = getTopProducts({ limit: 5 });
  }

  return context;
}

module.exports = {
  REGIONS,
  CATEGORIES,
  CHANNELS,
  analyzeQuestion,
  buildChatContext,
  getRevenueByRegion,
  getCategoryMetrics,
  getUnitsBySalesRep,
  getRevenueByChannel,
  getTopProducts,
};
