const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const adminAuth = require('../middleware/adminAuth');
const {
  subscribeCustomer,
  subscribeAdmin,
  unsubscribe,
  sendCustomNotification,
  getPushStats
} = require('../controllers/pushController');

// Customer subscription route
router.post('/subscribe', auth, subscribeCustomer);

// Admin subscription route
router.post('/admin-subscribe', adminAuth, subscribeAdmin);

// Unsubscribe route (public so client can unsubscribe anytime)
router.post('/unsubscribe', unsubscribe);

// Admin-only push management routes
router.post('/admin/send-custom', adminAuth, sendCustomNotification);
router.get('/admin/stats', adminAuth, getPushStats);

module.exports = router;
