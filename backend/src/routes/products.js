const express = require('express');
const { getProducts } = require('../queries/products');
const { sendSuccess } = require('../utils/apiResponse');
const asyncHandler = require('../middleware/asyncHandler');

const router = express.Router();

router.get(
  '/',
  asyncHandler((_req, res) => {
    const rows = getProducts();

    sendSuccess(res, {
      products: rows.map((row) => ({
        sku: row.sku,
        product_name: row.product_name,
        net_revenue: row.net_revenue,
        units: row.units,
      })),
    });
  }),
);

module.exports = router;
