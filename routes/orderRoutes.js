const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const {
  placeOrder,
  getOrders,
  getOrder,
  verifyPayment,
} = require('../controllers/orderController');

router.use(auth);
router.post('/', placeOrder);
router.post('/verify-payment', verifyPayment);
router.get('/', getOrders);
router.get('/:id', getOrder);

module.exports = router;
