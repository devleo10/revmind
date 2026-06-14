const express = require('express');
const { answerQuestion } = require('../services/chat');
const asyncHandler = require('../middleware/asyncHandler');

const router = express.Router();

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const { answer } = await answerQuestion(req.body?.question);
    res.status(200).json({ answer });
  }),
);

module.exports = router;
