const express = require('express');
const { answerQuestion } = require('../services/chat');
const asyncHandler = require('../middleware/asyncHandler');

const router = express.Router();

router.post(
  '/',
  asyncHandler(async (req, res) => {
    if (req.body !== null && typeof req.body !== 'object') {
      const error = new Error('request body must be a JSON object');
      error.statusCode = 400;
      throw error;
    }

    const { answer } = await answerQuestion(req.body?.question);
    res.status(200).json({ answer });
  }),
);

module.exports = router;
