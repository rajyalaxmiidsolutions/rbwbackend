const express = require('express');
const router = express.Router();
const { 
  authLimiter, 
  loginLimiter, 
  forgotPasswordLimiter, 
  otpLimiter 
} = require('../middleware/rateLimiter');
const {
  signup, verifyOTP, resendOTP, login, forgotPassword, resetPassword, logout
} = require('../controllers/authController');

router.post('/signup', authLimiter, signup);
router.post('/verify-otp', authLimiter, verifyOTP);
router.post('/resend-otp', otpLimiter, resendOTP);
router.post('/login', loginLimiter, login);
router.post('/forgot-password', forgotPasswordLimiter, forgotPassword);
router.post('/reset-password', authLimiter, resetPassword);
router.post('/logout', logout);

module.exports = router;
