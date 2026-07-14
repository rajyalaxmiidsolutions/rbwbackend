const errorHandler = (err, req, res, next) => {
  console.error('Error:', err.message);

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map((e) => e.message);
    return res.status(400).json({ message: messages.join(', ') });
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return res.status(400).json({ message: `${field} already exists` });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ message: 'Invalid token' });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({ message: 'Token expired' });
  }

  // Mongoose cast error (invalid ObjectId)
  if (err.name === 'CastError') {
    return res.status(400).json({ message: 'Invalid ID format' });
  }

  let errorMessage = err.message || 'Internal Server Error';

  // Handle Razorpay API errors
  if (err.error && typeof err.error === 'object' && err.error.description) {
    errorMessage = `Razorpay: ${err.error.description}`;
  } else if (err.description) {
    errorMessage = `Razorpay: ${err.description}`;
  }

  res.status(err.statusCode || 500).json({
    message: errorMessage,
    stack: err.stack,
    error: err
  });
};

module.exports = errorHandler;
