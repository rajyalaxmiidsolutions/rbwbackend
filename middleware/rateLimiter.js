const rateLimit = require('express-rate-limit');

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 100,
  message: { message: 'Too many requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs: 60 * 1000,  // 1 minute
  max: 5,
  message: { message: 'Too many authentication attempts, please try again after a minute' },
  standardHeaders: true,
  legacyHeaders: false,
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  message: { message: 'Too many login attempts. Please try again after 15 minutes' },
  standardHeaders: true,
  legacyHeaders: false,
});

const forgotPasswordLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3,
  message: { message: 'Too many password reset requests. Please try again after an hour' },
  standardHeaders: true,
  legacyHeaders: false,
});

const otpLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 3,
  message: { message: 'Too many OTP requests. Please try again after 10 minutes' },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = { 
  generalLimiter, 
  authLimiter,
  loginLimiter,
  forgotPasswordLimiter,
  otpLimiter
};
