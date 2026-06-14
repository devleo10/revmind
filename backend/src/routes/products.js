const express = require('express');
const { getProducts } = require('../queries/products');

const router = express.Router();

router.get('/', (_req, res) => {
  try {
    const rows = getProducts();

    res.json({
      products: rows.map((row) => ({
        sku: row.sku,
        product_name: row.product_name,
        net_revenue: row.net_revenue,
        units: row.units,
      })),
    });
  } catch (error) {
    console.error('GET /api/products failed:', error);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

module.exports = router;