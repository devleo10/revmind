const express = require('express');
const { getSummary } = require('../queries/summary');
const { sendSuccess } = require('../utils/apiResponse');
const asyncHandler = require('../middleware/asyncHandler');

const router = express.Router();

router.get(
  '/',
  asyncHandler((_req, res) => {
    sendSuccess(res, getSummary());
  }),
);

module.exports = router;
