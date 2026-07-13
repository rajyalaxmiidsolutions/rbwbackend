/**
 * One-time migration script to update old orders to the new schema.
 * - Sets all old orders to 'Delivered' status
 * - Backfills productTotal from totalPrice
 * - Adds empty deliveryInfo, productPayment, shippingPayment subdocuments
 * 
 * Run with: node backend/scripts/migrateOrders.js
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const connectDB = require('../config/db');

async function migrate() {
  await connectDB();

  const Order = mongoose.connection.collection('orders');
  const orders = await Order.find({}).toArray();

  console.log(`Found ${orders.length} orders to migrate.`);

  let migrated = 0;
  for (const order of orders) {
    const update = {};

    // Set orderStatus to Delivered for all old orders
    const newStatuses = [
      'Pending Payment', 'Paid', 'Shipping Set', 'Shipping Paid',
      'Confirmed', 'Shipped', 'Delivered', 'Cancelled',
    ];
    if (!newStatuses.includes(order.orderStatus)) {
      update.orderStatus = 'Delivered';
    }

    // Backfill productTotal from totalPrice if missing
    if (order.productTotal === undefined || order.productTotal === null) {
      update.productTotal = order.totalPrice || 0;
    }

    // Backfill shippingCharge if missing
    if (order.shippingCharge === undefined || order.shippingCharge === null) {
      update.shippingCharge = 0;
    }

    // Add empty subdocuments if missing
    if (!order.productPayment) {
      update.productPayment = {
        razorpayOrderId: order.razorpayOrderId || '',
        razorpayPaymentId: order.razorpayPaymentId || '',
        razorpaySignature: order.razorpaySignature || '',
      };
    }

    if (!order.shippingPayment) {
      update.shippingPayment = {
        razorpayOrderId: '',
        razorpayPaymentId: '',
        razorpaySignature: '',
      };
    }

    if (!order.deliveryInfo) {
      update.deliveryInfo = {
        receivingSpot: '',
        deliveryBoyPhone: '',
        deliveryBoyName: '',
        deliveryNotes: '',
        trackingNumber: '',
      };
    }

    // Remove old fields
    const unset = {};
    if (order.razorpayOrderId !== undefined) unset.razorpayOrderId = '';
    if (order.razorpayPaymentId !== undefined) unset.razorpayPaymentId = '';
    if (order.razorpaySignature !== undefined) unset.razorpaySignature = '';
    if (order.paymentStatus !== undefined) unset.paymentStatus = '';

    const updateOps = {};
    if (Object.keys(update).length > 0) updateOps.$set = update;
    if (Object.keys(unset).length > 0) updateOps.$unset = unset;

    if (Object.keys(updateOps).length > 0) {
      await Order.updateOne({ _id: order._id }, updateOps);
      migrated++;
      console.log(`  Migrated order ${order._id} → ${update.orderStatus || order.orderStatus}`);
    }
  }

  console.log(`\nMigration complete. ${migrated}/${orders.length} orders updated.`);
  process.exit(0);
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
