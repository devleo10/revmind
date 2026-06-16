const fs = require('fs');
const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { testDbPath } = require('./setup');
const { seed } = require('../seed');
const { closeDb } = require('../src/db');
const {
  analyzeQuestion,
  buildChatContext,
  computeAnswerHints,
  getCategoryMetrics,
  getRevenueByRegion,
  getUnitsBySalesRep,
} = require('../src/queries/chatContext');
const { tryDirectAnswer } = require('../src/services/chatInsights');

describe('analyzeQuestion', () => {
  it('detects quarter, year, and region intent for Q1 2024 question', () => {
    const analysis = analyzeQuestion(
      'Which region had the highest net revenue in Q1 2024?',
    );

    assert.equal(analysis.quarter, 'Q1-2024');
    assert.equal(analysis.year, 2024);
    assert.equal(analysis.asksAboutRegions, true);
  });

  it('detects Snacks category and margin intent', () => {
    const analysis = analyzeQuestion(
      'What is the gross profit margin for the Snacks category?',
    );

    assert.deepEqual(analysis.categories, ['Snacks']);
    assert.equal(analysis.asksAboutMargin, true);
  });

  it('detects sales rep and 2025 year', () => {
    const analysis = analyzeQuestion(
      'Which sales rep closed the most units in 2025?',
    );

    assert.equal(analysis.year, 2025);
    assert.equal(analysis.asksAboutReps, true);
  });

  it('detects channel comparison intent', () => {
    const analysis = analyzeQuestion(
      'Compare E-Commerce vs Modern Trade net revenue.',
    );

    assert.equal(analysis.asksChannelComparison, true);
    assert.ok(analysis.channels.includes('E-Commerce'));
    assert.ok(analysis.channels.includes('Modern Trade'));
  });

  it('detects channel aliases and informal phrasing', () => {
    const analysis = analyzeQuestion(
      'Compare ecommerce versus modern trade revenue',
    );

    assert.equal(analysis.asksChannelComparison, true);
    assert.ok(analysis.channels.includes('E-Commerce'));
    assert.ok(analysis.channels.includes('Modern Trade'));
  });

  it('detects snack alias and first quarter phrasing', () => {
    const marginAnalysis = analyzeQuestion(
      'What margin did snack products make?',
    );
    assert.deepEqual(marginAnalysis.categories, ['Snacks']);
    assert.equal(marginAnalysis.asksAboutMargin, true);

    const quarterAnalysis = analyzeQuestion(
      'Which region led revenue in the first quarter of 2024?',
    );
    assert.equal(quarterAnalysis.quarter, 'Q1-2024');
    assert.equal(quarterAnalysis.asksAboutRegions, true);
  });

  it('detects West region and product intent', () => {
    const analysis = analyzeQuestion(
      'What was the best performing product in the West region?',
    );

    assert.deepEqual(analysis.regions, ['West']);
    assert.equal(analysis.asksAboutProducts, true);
  });
});

describe('chat data queries (seeded SQLite)', () => {
  before(() => {
    seed({ force: true });
  });

  after(() => {
    closeDb();
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
  });

  it('returns South as top Q1 2024 region by net revenue', () => {
    const rows = getRevenueByRegion({ quarter: 'Q1-2024' });

    assert.equal(rows[0].region, 'South');
    assert.equal(Number(rows[0].net_revenue.toFixed(2)), 37640.11);
  });

  it('returns 52.04% gross profit margin for Snacks', () => {
    const rows = getCategoryMetrics({ category: 'Snacks' });

    assert.equal(rows[0].category, 'Snacks');
    assert.equal(rows[0].gross_profit_margin_pct, 52.04);
  });

  it('returns Rohan Gupta as top rep by units in 2025', () => {
    const rows = getUnitsBySalesRep({ year: 2025 });

    assert.equal(rows[0].sales_rep, 'Rohan Gupta');
    assert.equal(rows[0].units, 14826);
  });

  it('buildChatContext includes targeted slices for assignment questions', () => {
    const regionContext = buildChatContext(
      'Which region had the highest net revenue in Q1 2024?',
    );
    assert.ok(regionContext.context.revenue_by_region);
    assert.equal(regionContext.context.revenue_by_region[0].region, 'South');
    assert.ok(regionContext.context.answer_hints);

    const marginContext = buildChatContext(
      'What is the gross profit margin for the Snacks category?',
    );
    assert.ok(marginContext.context.category_metrics);
    const snacks = marginContext.context.category_metrics.find(
      (row) => row.category === 'Snacks',
    );
    assert.equal(snacks.gross_profit_margin_pct, 52.04);
  });

  it('returns SQL-verified direct answers for assignment questions', () => {
    const questions = [
      {
        question: 'Which region had the highest net revenue in Q1 2024?',
        expected: 'South',
      },
      {
        question: 'What is the gross profit margin for the Snacks category?',
        expected: '52.04%',
      },
      {
        question: 'Which sales rep closed the most units in 2025?',
        expected: 'Rohan Gupta',
      },
      {
        question: 'Compare E-Commerce vs Modern Trade net revenue.',
        expected: 'E-Commerce',
      },
      {
        question: 'What was the best performing product in the West region?',
        expected: 'NovaBite Shampoo Coconut 400ml',
      },
    ];

    for (const { question, expected } of questions) {
      const { analysis, answerHints } = buildChatContext(question);
      const answer = tryDirectAnswer(analysis, answerHints);
      assert.ok(answer, `expected direct answer for: ${question}`);
      assert.match(answer, new RegExp(expected, 'i'));
    }
  });

  it('computeAnswerHints returns channel comparison values', () => {
    const analysis = analyzeQuestion(
      'Compare E-Commerce vs Modern Trade net revenue.',
    );
    const hints = computeAnswerHints(analysis);
    const comparison = hints.find(
      (hint) => hint.type === 'channel_net_revenue_comparison',
    );

    assert.ok(comparison);
    assert.equal(comparison.channels[0].channel, 'E-Commerce');
    assert.equal(comparison.channels[0].net_revenue, 360607.55);
  });
});
