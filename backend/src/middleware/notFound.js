const { sendError } = require('../utils/apiResponse');

function notFound(_req, res) {
  sendError(res, 404, 'Route not found');
}

module.exports = notFound;
