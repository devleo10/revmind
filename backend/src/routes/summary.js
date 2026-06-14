const express = require('express');
const { getSummary } = require('../queries/summary');

const router = express.Router();

router.get('/', (_req, res) => {
  try {
    res.json(getSummary());
  } catch (error) {
    console.error('GET /api/summary failed:', error);
    res.status(500).json({ error: 'Failed to fetch summary' });
  }
});

module.exports = router;
