const express = require('express');
const { getCategoryRevenue } = require('../queries/categories');
const { sendSuccess } = require('../utils/apiResponse');
const asyncHandler = require('../middleware/asyncHandler');

const router = express.Router();

router.get(
  '/',
  asyncHandler((_req, res) => {
    const rows = getCategoryRevenue();

    sendSuccess(res, {
      categories: rows.map((row) => ({
        category: row.category,
        net_revenue: row.net_revenue,
        units: row.units,
      })),
    });
  }),
);

module.exports = router;
