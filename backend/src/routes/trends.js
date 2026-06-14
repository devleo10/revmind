const express = require('express');
const { getTrends } = require('../queries/trends');

const router = express.Router();

router.get('/', (_req, res) => {
  try {
    const rows = getTrends();

    res.json({
      trends: rows.map((row) => ({
        month: row.month,
        net_revenue: row.net_revenue,
      })),
    });
  } catch (error) {
    console.error('GET /api/trends failed:', error);
    res.status(500).json({ error: 'Failed to fetch trends' });
  }
});

module.exports = router;
