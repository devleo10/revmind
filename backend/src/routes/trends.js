const express = require('express');
const { getTrends } = require('../queries/trends');
const { sendSuccess } = require('../utils/apiResponse');
const asyncHandler = require('../middleware/asyncHandler');

const router = express.Router();

router.get(
  '/',
  asyncHandler((_req, res) => {
    const rows = getTrends();

    sendSuccess(res, {
      trends: rows.map((row) => ({
        month: row.month,
        net_revenue: row.net_revenue,
      })),
    });
  }),
);

module.exports = router;
