const errorHandler = (err, req, res, next) => {
  console.error(err.stack || err);

  const statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';

  // Handle custom Mongoose validation/cast errors
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map(e => e.message);
    return res.status(400).json({
      success: false,
      message: messages.join(', ')
    });
  }

  if (err.name === 'CastError') {
    return res.status(400).json({
      success: false,
      message: `Invalid field format for: ${err.path}`
    });
  }

  res.status(statusCode).json({
    success: false,
    message
  });
};

module.exports = errorHandler;
