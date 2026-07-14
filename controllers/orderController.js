const Order = require('../models/Order');
const Cart = require('../models/Cart');
const Product = require('../models/Product');
const Location = require('../models/Location');
const Admin = require('../models/Admin');
const { sendOrderReceivedEmail, sendOrderFinalConfirmationEmail, sendAdminOrderPlacedEmail } = require('../utils/sendEmail');
const Razorpay = require('razorpay');

const razorpayKeyId = (process.env.RAZORPAY_KEY_ID || '').trim();
const razorpayKeySecret = (process.env.RAZORPAY_KEY_SECRET || '').trim();

const razorpay = new Razorpay({
  key_id: razorpayKeyId,
  key_secret: razorpayKeySecret,
});

// Place order — single payment (product + shipping)
exports.placeOrder = async (req, res, next) => {
  try {
    const { shippingAddress, paymentMethod, locationId } = req.body;

    const cart = await Cart.findOne({ user: req.user._id }).populate('items.product');
    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ message: 'Cart is empty' });
    }

    // Look up shipping location
    let shippingCharge = 0;
    let shippingLocation = { name: '', charge: 0 };

    if (locationId) {
      const location = await Location.findById(locationId);
      if (!location || !location.isActive) {
        return res.status(400).json({ message: 'Invalid or inactive shipping location' });
      }
      shippingCharge = location.shippingCharge;
      shippingLocation = { name: location.name, charge: location.shippingCharge };
    }

    // Build order products with snapshot data
    const products = cart.items.map((item) => ({
      product: item.product._id,
      name: item.product.name,
      price: item.product.price,
      quantity: item.quantity,
      image: item.product.images?.[0]?.url || '',
    }));

    const productTotal = products.reduce(
      (sum, item) => sum + item.price * item.quantity, 0
    );

    const totalPrice = productTotal + shippingCharge;

    const order = await Order.create({
      user: req.user._id,
      products,
      shippingAddress,
      shippingLocation,
      paymentMethod,
      productTotal,
      shippingCharge,
      totalPrice,
      orderStatus: 'Pending Payment',
    });

    // Create Razorpay order for full amount (product + shipping)
    const options = {
      amount: Math.round(totalPrice * 100), // amount in paise
      currency: 'INR',
      receipt: `order_${order._id.toString()}`,
    };

    const razorpayOrder = await razorpay.orders.create(options);

    order.payment.razorpayOrderId = razorpayOrder.id;
    await order.save();

    return res.status(201).json({
      message: 'Razorpay order created',
      order,
      razorpayOrder,
    });
  } catch (error) {
    next(error);
  }
};

// Verify payment — Razorpay
exports.verifyPayment = async (req, res, next) => {
  try {
    const { orderId, razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;

    const crypto = require('crypto');
    const hmac = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET);
    hmac.update(`${razorpayOrderId}|${razorpayPaymentId}`);
    const generatedSignature = hmac.digest('hex');

    if (generatedSignature !== razorpaySignature) {
      return res.status(400).json({ message: 'Payment signature verification failed' });
    }

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    order.payment.razorpayOrderId = razorpayOrderId;
    order.payment.razorpayPaymentId = razorpayPaymentId;
    order.payment.razorpaySignature = razorpaySignature;
    order.orderStatus = 'Paid';
    await order.save();

    // Clear cart now that payment is successful
    await Cart.findOneAndDelete({ user: order.user });

    // Reduce stock
    for (const item of order.products) {
      await Product.findByIdAndUpdate(item.product, {
        $inc: { stock: -item.quantity },
      });
    }

    // Send admin push notification
    try {
      const pushService = require('../utils/pushService');
      const adminPayload = {
        title: '💰 New Order Received',
        body: `Order #${order._id.toString().slice(-6).toUpperCase()} of ₹${order.totalPrice} from ${order.shippingAddress.name || 'Customer'}.`,
        icon: '/favicon.ico',
        url: '/admin/orders'
      };
      pushService.sendToAdmins(adminPayload).catch(err => console.error("Admin push notification failed:", err));
    } catch (pushErr) {
      console.error("Push service initialization or call error:", pushErr.message);
    }

    res.status(200).json({ message: 'Payment verified successfully', order });
  } catch (error) {
    next(error);
  }
};

// Get user's orders
exports.getOrders = async (req, res, next) => {
  try {
    const orders = await Order.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.status(200).json(orders);
  } catch (error) {
    next(error);
  }
};

// Get single order
exports.getOrder = async (req, res, next) => {
  try {
    const order = await Order.findOne({ _id: req.params.id, user: req.user._id });
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    res.status(200).json(order);
  } catch (error) {
    next(error);
  }
};
