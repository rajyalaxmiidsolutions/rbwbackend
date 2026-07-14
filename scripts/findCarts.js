const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const Cart = require('../models/Cart');

async function test() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("Connected to DB");
  const carts = await Cart.find().populate('items.product');
  console.log("Found carts:", JSON.stringify(carts, null, 2));
  await mongoose.disconnect();
}

test().catch(console.error);
