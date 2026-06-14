const { sendError } = require('../utils/apiResponse');

function errorHandler(err, _req, res, _next) {
  console.error(err);

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal server error';

  sendError(res, statusCode, message);
}

module.exports = errorHandler;
