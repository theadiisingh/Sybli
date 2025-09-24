/**
 * Error Handler Middleware
 * Centralized error handling for the application
 */

const errorHandler = (err, req, res, next) => {
  console.error(err.stack);

  // Default error response
  const errorResponse = {
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  };

  // Handle specific error types
  if (err.name === 'ValidationError') {
    errorResponse.error = 'Validation Error';
    errorResponse.message = err.message;
    return res.status(400).json(errorResponse);
  }

  if (err.name === 'UnauthorizedError') {
    errorResponse.error = 'Unauthorized';
    errorResponse.message = 'Invalid credentials';
    return res.status(401).json(errorResponse);
  }

  res.status(err.status || 500).json(errorResponse);
};

module.exports = errorHandler;
