function notFound(req, res, _next) {
  res.status(404).json({ message: `Not Found - ${req.originalUrl}` });
}

// Centralized error handler
// eslint-disable-next-line no-unused-vars
function errorHandler(err, _req, res, _next) {
  const status = res.statusCode && res.statusCode !== 200 ? res.statusCode : 500;
  res.status(status).json({
    message: err.message || 'Internal Server Error',
    stack: process.env.NODE_ENV === 'production' ? undefined : err.stack,
  });
}

module.exports = { notFound, errorHandler };


