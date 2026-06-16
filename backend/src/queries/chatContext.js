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

const CHANNEL_ALIASES = [
  { pattern: /\be[\s-]?commerce\b/i, channel: 'E-Commerce' },
  { pattern: /\bmodern\s+trade\b/i, channel: 'Modern Trade' },
  { pattern: /\bgeneral\s+trade\b/i, channel: 'General Trade' },
  { pattern: /\b(direct\s+to\s+consumer|dtc)\b/i, channel: 'Direct to Consumer' },
];

const CATEGORY_ALIASES = [
  { pattern: /\bpersonal\s+care\b/i, category: 'Personal Care' },
  { pattern: /\bsnacks?\b/i, category: 'Snacks' },
  { pattern: /\bbeverages?\b/i, category: 'Beverages' },
  { pattern: /\bhome\s+care\b/i, category: 'Home Care' },
];

const QUARTER_WORDS = {
  first: 1,
  '1st': 1,
  second: 2,
  '2nd': 2,
  third: 3,
  '3rd': 3,
  fourth: 4,
  '4th': 4,
};

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
  let match = question.match(/\bQ([1-4])\s*[-']?\s*(2024|2025)\b/i);
  if (match) {
    return `Q${match[1]}-${match[2]}`;
  }

  match = question.match(
    /\b(first|1st|second|2nd|third|3rd|fourth|4th)\s+quarter\s+(?:of\s+)?(2024|2025)\b/i,
  );
  if (match) {
    const quarter = QUARTER_WORDS[match[1].toLowerCase()];
    return `Q${quarter}-${match[2]}`;
  }

  return null;
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
  const found = new Set(
    CATEGORIES.filter((category) =>
      new RegExp(`\\b${category.replace(' ', '\\s+')}\\b`, 'i').test(question),
    ),
  );

  for (const { pattern, category } of CATEGORY_ALIASES) {
    if (pattern.test(question)) {
      found.add(category);
    }
  }

  return [...found];
}

function detectChannels(question) {
  const found = new Set(
    CHANNELS.filter((channel) =>
      new RegExp(`\\b${channel.replace(/[- ]/g, '[- ]')}\\b`, 'i').test(question),
    ),
  );

  for (const { pattern, channel } of CHANNEL_ALIASES) {
    if (pattern.test(question)) {
      found.add(channel);
    }
  }

  return [...found];
}

function analyzeQuestion(question) {
  const normalized = question.toLowerCase();
  const channels = detectChannels(question);
  const categories = detectCategories(question);
  const regions = detectRegions(question);

  return {
    quarter: detectQuarter(question),
    year: detectYear(question),
    regions,
    categories,
    channels,
    asksAboutReps:
      /\b(sales rep|sales representative|rep|representative)\b/i.test(question) ||
      /\bclosed\b.*\bunits\b/i.test(question) ||
      /\bmost units\b/i.test(question) ||
      /\btop\b.*\b(rep|representative)\b/i.test(question),
    asksAboutMargin:
      /\b(gross profit margin|profit margin|margin)\b/i.test(question),
    asksAboutProducts:
      /\b(product|sku|best performing|top product|best seller|best-selling)\b/i.test(
        question,
      ) ||
      (/\b(best|top|highest|leading)\b/i.test(question) &&
        /\b(product|sku|item)\b/i.test(question)),
    asksAboutRegions:
      !/\b(product|sku|item)\b/i.test(question) &&
      (/\b(region|regions)\b/i.test(question) ||
        /\b(highest|top|best|leading)\b.*\b(revenue|net revenue)\b/i.test(
          question,
        ) ||
        /\b(highest|top|best|leading)\b.*\bregion\b/i.test(question)),
    asksChannelComparison:
      /\b(compare|comparison|vs\.?|versus)\b/i.test(question) &&
      (/\b(channel|trade|commerce|e-commerce)\b/i.test(question) ||
        channels.length >= 2),
    asksAboutChannels: /\b(channel|trade|commerce|e-commerce|dtc)\b/i.test(
      normalized,
    ),
  };
}

function computeAnswerHints(analysis) {
  const hints = [];
  const quarterFilter = analysis.quarter ? { quarter: analysis.quarter } : {};
  const yearFilter = analysis.year ? { year: analysis.year } : {};

  if (
    analysis.asksAboutRegions ||
    analysis.quarter ||
    analysis.regions.length > 0
  ) {
    const rows = getRevenueByRegion({
      ...quarterFilter,
      ...(analysis.year && !analysis.quarter ? yearFilter : {}),
    });

    if (rows.length > 0) {
      hints.push({
        type: 'top_region_by_net_revenue',
        filters: {
          quarter: analysis.quarter,
          year: analysis.year,
        },
        result: {
          region: rows[0].region,
          net_revenue: round(rows[0].net_revenue),
        },
      });
    }
  }

  if (analysis.asksAboutMargin && analysis.categories.length === 1) {
    const rows = getCategoryMetrics({ category: analysis.categories[0] });

    if (rows.length > 0) {
      hints.push({
        type: 'category_gross_profit_margin_pct',
        category: analysis.categories[0],
        result: rows[0].gross_profit_margin_pct,
      });
    }
  }

  if (analysis.asksAboutReps) {
    const rows = getUnitsBySalesRep(yearFilter);

    if (rows.length > 0) {
      hints.push({
        type: 'top_sales_rep_by_units',
        filters: { year: analysis.year },
        result: {
          sales_rep: rows[0].sales_rep,
          units: rows[0].units,
        },
      });
    }
  }

  if (analysis.asksChannelComparison && analysis.channels.length >= 2) {
    const rows = getRevenueByChannel({ channels: analysis.channels });

    if (rows.length > 0) {
      hints.push({
        type: 'channel_net_revenue_comparison',
        channels: rows.map((row) => ({
          channel: row.channel,
          net_revenue: round(row.net_revenue),
        })),
      });
    }
  }

  if (analysis.asksAboutProducts && analysis.regions.length === 1) {
    const rows = getTopProducts({
      region: analysis.regions[0],
      limit: 1,
    });

    if (rows.length > 0) {
      hints.push({
        type: 'top_product_in_region',
        region: analysis.regions[0],
        result: {
          sku: rows[0].sku,
          product_name: rows[0].product_name,
          net_revenue: round(rows[0].net_revenue),
        },
      });
    }
  }

  return hints;
}

function buildChatContext(question, analysis = analyzeQuestion(question)) {
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

  const answerHints = computeAnswerHints(analysis);
  if (answerHints.length > 0) {
    context.answer_hints = answerHints;
  }

  return { context, analysis, answerHints };
}

module.exports = {
  REGIONS,
  CATEGORIES,
  CHANNELS,
  analyzeQuestion,
  buildChatContext,
  computeAnswerHints,
  getRevenueByRegion,
  getCategoryMetrics,
  getUnitsBySalesRep,
  getRevenueByChannel,
  getTopProducts,
};
