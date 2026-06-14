function sendSuccess(res, data, statusCode = 200) {
  res.status(statusCode).json({ data });
}

function sendError(res, statusCode, message) {
  res.status(statusCode).json({
    error: {
      message,
      statusCode,
    },
  });
}

module.exports = {
  sendSuccess,
  sendError,
};
