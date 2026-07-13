const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
  },
  name: { type: String, required: true },
  price: { type: Number, required: true },
  quantity: { type: Number, required: true, min: 1 },
  image: { type: String, default: '' },
}, { _id: false });

const paymentDetailSchema = new mongoose.Schema({
  razorpayOrderId: { type: String, default: '' },
  razorpayPaymentId: { type: String, default: '' },
  razorpaySignature: { type: String, default: '' },
}, { _id: false });

const deliveryInfoSchema = new mongoose.Schema({
  receivingSpot: { type: String, default: '' },
  deliveryBoyPhone: { type: String, default: '' },
  deliveryBoyName: { type: String, default: '' },
  deliveryNotes: { type: String, default: '' },
  trackingNumber: { type: String, default: '' },
}, { _id: false });

const orderSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  products: [orderItemSchema],
  shippingAddress: {
    fullName: { type: String, required: true },
    phone: { type: String, required: true },
    email: { type: String, required: true },
    businessName: { type: String, default: '' },
    gstNumber: { type: String, default: '' },
    street: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    pincode: { type: String, required: true },
  },
  // Shipping location chosen by customer
  shippingLocation: {
    name: { type: String, default: '' },
    charge: { type: Number, default: 0 },
  },
  paymentMethod: {
    type: String,
    enum: ['Razorpay'],
    required: true,
  },
  orderStatus: {
    type: String,
    enum: [
      'Pending Payment',
      'Paid',
      'Confirmed',
      'Shipped',
      'Delivered',
    ],
    default: 'Pending Payment',
  },
  // Price breakdown
  productTotal: {
    type: Number,
    required: true,
    min: 0,
  },
  shippingCharge: {
    type: Number,
    default: 0,
    min: 0,
  },
  totalPrice: {
    type: Number,
    required: true,
    min: 0,
  },
  // Single payment tracking (product + shipping combined)
  payment: {
    type: paymentDetailSchema,
    default: () => ({}),
  },
  // Delivery information (set by admin)
  deliveryInfo: {
    type: deliveryInfoSchema,
    default: () => ({}),
  },
}, {
  timestamps: true,
});

orderSchema.index({ user: 1, createdAt: -1 });
orderSchema.index({ orderStatus: 1 });

module.exports = mongoose.model('Order', orderSchema);
