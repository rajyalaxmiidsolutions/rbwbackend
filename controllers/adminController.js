const Admin = require('../models/Admin');
const Product = require('../models/Product');
const Order = require('../models/Order');
const User = require('../models/User');
const Category = require('../models/Category');
const Location = require('../models/Location');
const Testimonial = require('../models/Testimonial');
const Gallery = require('../models/Gallery');
const cloudinary = require('../config/cloudinary');
const generateToken = require('../utils/generateToken');
const { sendOrderDeliveredEmailWithPdf } = require('../utils/sendEmail');
const { generateInvoicePDF } = require('../utils/pdfGenerator');

// Admin login
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const admin = await Admin.findOne({ email }).select('+password');
    if (!admin) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const isMatch = await admin.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = generateToken(admin._id, admin.role);

    // Set secure httpOnly cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    res.status(200).json({ token, admin: { _id: admin._id, name: admin.name, email: admin.email, role: admin.role } });
  } catch (error) {
    next(error);
  }
};

// Dashboard stats
exports.getDashboard = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    
    let dateFilter = {};
    if (startDate && endDate) {
      dateFilter = {
        createdAt: {
          $gte: new Date(startDate),
          $lte: new Date(endDate),
        },
      };
    }

    const [
      totalProducts,
      ordersCount,
      newCustomersCount,
      revenueResult,
      ordersToConfirm,
      recentOrders,
      outOfStockAlerts,
      outOfStockCount,
      lowStockAlerts,
      lowStockCount
    ] = await Promise.all([
      // 1. Total active products (ignores date filter)
      Product.countDocuments({ status: 'active' }),
      
      // 2. Orders in date range
      Order.countDocuments(dateFilter),
      
      // 3. New Customers in date range
      User.countDocuments({ verified: true, ...dateFilter }),
      
      // 4. Revenue in date range (only Paid, Confirmed, Shipped, Delivered)
      Order.aggregate([
        {
          $match: {
            orderStatus: { $in: ['Paid', 'Confirmed', 'Shipped', 'Delivered'] },
            ...dateFilter,
          },
        },
        { $group: { _id: null, total: { $sum: '$totalPrice' } } },
      ]),

      // 5. Orders to confirm count (ignores date filter)
      Order.countDocuments({ orderStatus: 'Paid' }),

      // 6. Recent 5 orders (ignores date filter)
      Order.find()
        .populate('user', 'name email')
        .sort({ createdAt: -1 })
        .limit(5),

      // 7. Out of stock products (ignores date filter)
      Product.find({ stock: 0 }).limit(5),
      Product.countDocuments({ stock: 0 }),

      // 8. Low stock products (ignores date filter)
      Product.find({
        stock: { $gt: 0 },
        $expr: { $lte: ['$stock', { $multiply: ['$moq', 2] }] }
      }).limit(5),
      Product.countDocuments({
        stock: { $gt: 0 },
        $expr: { $lte: ['$stock', { $multiply: ['$moq', 2] }] }
      }),
    ]);

    res.status(200).json({
      kpis: {
        totalProducts,
        orders: ordersCount,
        newCustomers: newCustomersCount,
        revenue: revenueResult[0]?.total || 0,
      },
      needsAttention: {
        ordersToConfirm,
      },
      recentOrders,
      stockAlerts: {
        outOfStock: outOfStockAlerts,
        outOfStockCount,
        lowStock: lowStockAlerts,
        lowStockCount,
      },
    });
  } catch (error) {
    next(error);
  }
};

// --- PRODUCT MANAGEMENT ---

exports.createProduct = async (req, res, next) => {
  try {
    const { name, description, category, price, moq, stock, status } = req.body;
    const images = req.files
      ? req.files.map((file) => ({ url: file.path, publicId: file.filename }))
      : [];

    const product = await Product.create({
      name, description, category, price, moq, images, stock, status,
    });

    res.status(201).json(product);
  } catch (error) {
    next(error);
  }
};

exports.updateProduct = async (req, res, next) => {
  try {
    const { name, description, category, price, moq, stock, status, existingImages } = req.body;

    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });

    // Handle images
    let images = [];

    // Keep existing images that weren't removed
    if (existingImages) {
      const kept = JSON.parse(existingImages);
      images = kept;
    }

    // Add newly uploaded images
    if (req.files && req.files.length > 0) {
      const newImages = req.files.map((file) => ({ url: file.path, publicId: file.filename }));
      images = [...images, ...newImages];
    }

    // Delete removed images from Cloudinary
    const keptIds = images.map((img) => img.publicId);
    const removedImages = product.images.filter((img) => !keptIds.includes(img.publicId));
    for (const img of removedImages) {
      try {
        await cloudinary.uploader.destroy(img.publicId);
      } catch (err) {
        console.error('Cloudinary delete error:', err.message);
      }
    }

    const updated = await Product.findByIdAndUpdate(
      req.params.id,
      { name, description, category, price, moq, stock, status, images },
      { new: true, runValidators: true }
    ).populate('category', 'name slug');

    res.status(200).json(updated);
  } catch (error) {
    next(error);
  }
};

exports.deleteProduct = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });

    // Delete images from Cloudinary
    for (const img of product.images) {
      try {
        await cloudinary.uploader.destroy(img.publicId);
      } catch (err) {
        console.error('Cloudinary delete error:', err.message);
      }
    }

    await Product.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: 'Product deleted' });
  } catch (error) {
    next(error);
  }
};

exports.getAllProducts = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, search, category, status } = req.query;
    const query = {};
    if (search) query.name = { $regex: search, $options: 'i' };
    if (category) query.category = category;
    if (status) query.status = status;

    const skip = (Number(page) - 1) * Number(limit);
    const [products, total] = await Promise.all([
      Product.find(query).populate('category', 'name').sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
      Product.countDocuments(query),
    ]);

    res.status(200).json({ products, totalPages: Math.ceil(total / Number(limit)), total });
  } catch (error) {
    next(error);
  }
};

// --- CATEGORY MANAGEMENT ---

exports.createCategory = async (req, res, next) => {
  try {
    const { name, description } = req.body;
    let image = {};
    if (req.files && req.files.length > 0) {
      image = { url: req.files[0].path, publicId: req.files[0].filename };
    }
    const category = await Category.create({ name, description, image });
    res.status(201).json(category);
  } catch (error) {
    next(error);
  }
};

exports.updateCategory = async (req, res, next) => {
  try {
    const { name, description } = req.body;
    const update = { name, description };

    if (req.files && req.files.length > 0) {
      const category = await Category.findById(req.params.id);
      if (category?.image?.publicId) {
        try { await cloudinary.uploader.destroy(category.image.publicId); } catch (e) { /* ignore */ }
      }
      update.image = { url: req.files[0].path, publicId: req.files[0].filename };
    }

    const category = await Category.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true });
    if (!category) return res.status(404).json({ message: 'Category not found' });
    res.status(200).json(category);
  } catch (error) {
    next(error);
  }
};

exports.deleteCategory = async (req, res, next) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) return res.status(404).json({ message: 'Category not found' });

    // Check if products exist in this category
    const productCount = await Product.countDocuments({ category: req.params.id });
    if (productCount > 0) {
      return res.status(400).json({ message: `Cannot delete category with ${productCount} products` });
    }

    if (category.image?.publicId) {
      try { await cloudinary.uploader.destroy(category.image.publicId); } catch (e) { /* ignore */ }
    }

    await Category.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: 'Category deleted' });
  } catch (error) {
    next(error);
  }
};

// Toggle featured status on a category
exports.toggleFeatured = async (req, res, next) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) return res.status(404).json({ message: 'Category not found' });

    category.isFeatured = !category.isFeatured;
    await category.save();

    res.status(200).json(category);
  } catch (error) {
    next(error);
  }
};

// --- LOCATION MANAGEMENT ---

exports.getLocations = async (req, res, next) => {
  try {
    const locations = await Location.find().sort({ name: 1 });
    res.status(200).json(locations);
  } catch (error) {
    next(error);
  }
};

exports.createLocation = async (req, res, next) => {
  try {
    const { name, shippingCharge, isActive } = req.body;
    const location = await Location.create({ name, shippingCharge, isActive });
    res.status(201).json(location);
  } catch (error) {
    next(error);
  }
};

exports.updateLocation = async (req, res, next) => {
  try {
    const { name, shippingCharge, isActive } = req.body;
    const location = await Location.findByIdAndUpdate(
      req.params.id,
      { name, shippingCharge, isActive },
      { new: true, runValidators: true }
    );
    if (!location) return res.status(404).json({ message: 'Location not found' });
    res.status(200).json(location);
  } catch (error) {
    next(error);
  }
};

exports.deleteLocation = async (req, res, next) => {
  try {
    const location = await Location.findByIdAndDelete(req.params.id);
    if (!location) return res.status(404).json({ message: 'Location not found' });
    res.status(200).json({ message: 'Location deleted' });
  } catch (error) {
    next(error);
  }
};

// --- TESTIMONIAL MANAGEMENT ---

exports.getTestimonials = async (req, res, next) => {
  try {
    const testimonials = await Testimonial.find().sort({ createdAt: -1 });
    res.status(200).json(testimonials);
  } catch (error) {
    next(error);
  }
};

exports.createTestimonial = async (req, res, next) => {
  try {
    const { name, business, text, rating, isActive } = req.body;
    const testimonial = await Testimonial.create({ name, business, text, rating, isActive });
    res.status(201).json(testimonial);
  } catch (error) {
    next(error);
  }
};

exports.updateTestimonial = async (req, res, next) => {
  try {
    const { name, business, text, rating, isActive } = req.body;
    const testimonial = await Testimonial.findByIdAndUpdate(
      req.params.id,
      { name, business, text, rating, isActive },
      { new: true, runValidators: true }
    );
    if (!testimonial) return res.status(404).json({ message: 'Testimonial not found' });
    res.status(200).json(testimonial);
  } catch (error) {
    next(error);
  }
};

exports.deleteTestimonial = async (req, res, next) => {
  try {
    const testimonial = await Testimonial.findByIdAndDelete(req.params.id);
    if (!testimonial) return res.status(404).json({ message: 'Testimonial not found' });
    res.status(200).json({ message: 'Testimonial deleted' });
  } catch (error) {
    next(error);
  }
};

// --- ORDER MANAGEMENT ---

exports.getAllOrders = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, status, search, startDate, endDate } = req.query;
    
    // 1. Build search criteria
    let searchCriteria = {};
    if (search && search.trim() !== '') {
      const cleanSearch = search.trim();
      const User = require('../models/User');
      const Product = require('../models/Product');
      
      const matchingUsers = await User.find({
        $or: [
          { name: { $regex: cleanSearch, $options: 'i' } },
          { email: { $regex: cleanSearch, $options: 'i' } }
        ]
      }, '_id');
      const userIds = matchingUsers.map(u => u._id);

      const matchingProducts = await Product.find({
        name: { $regex: cleanSearch, $options: 'i' }
      }, '_id');
      const productIds = matchingProducts.map(p => p._id);

      const orConditions = [
        { user: { $in: userIds } },
        { 'products.product': { $in: productIds } },
        { paymentMethod: { $regex: cleanSearch, $options: 'i' } },
        { orderStatus: { $regex: cleanSearch, $options: 'i' } }
      ];

      orConditions.push({
        $expr: {
          $regexMatch: {
            input: { $toString: '$_id' },
            regex: cleanSearch,
            options: 'i'
          }
        }
      });

      const searchNum = Number(cleanSearch);
      if (!isNaN(searchNum)) {
        orConditions.push({ totalPrice: searchNum });
      }

      searchCriteria = { $or: orConditions };
    }

    // 2. Build date criteria (ignored if search exists)
    let dateCriteria = {};
    if ((!search || search.trim() === '') && startDate && endDate) {
      dateCriteria = {
        createdAt: {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        }
      };
    }

    // 3. Status counts query (date criteria + search criteria)
    const countQuery = { ...dateCriteria, ...searchCriteria };
    const [
      allCount,
      pendingPaymentCount,
      paidCount,
      confirmedCount,
      shippedCount,
      deliveredCount
    ] = await Promise.all([
      Order.countDocuments(countQuery),
      Order.countDocuments({ ...countQuery, orderStatus: 'Pending Payment' }),
      Order.countDocuments({ ...countQuery, orderStatus: 'Paid' }),
      Order.countDocuments({ ...countQuery, orderStatus: 'Confirmed' }),
      Order.countDocuments({ ...countQuery, orderStatus: 'Shipped' }),
      Order.countDocuments({ ...countQuery, orderStatus: 'Delivered' }),
    ]);

    // 4. Build final query for records
    const finalQuery = { ...countQuery };
    if (status && status !== 'All') {
      finalQuery.orderStatus = status;
    }

    const skip = (Number(page) - 1) * Number(limit);
    const total = await Order.countDocuments(finalQuery);

    const orders = await Order.find(finalQuery)
      .populate('user', 'name email phone businessName')
      .populate('products.product', 'name price')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    res.status(200).json({
      orders,
      totalPages: Math.ceil(total / Number(limit)),
      total,
      statusCounts: {
        All: allCount,
        'Pending Payment': pendingPaymentCount,
        Paid: paidCount,
        Confirmed: confirmedCount,
        Shipped: shippedCount,
        Delivered: deliveredCount,
      }
    });
  } catch (error) {
    next(error);
  }
};

exports.updateOrderStatus = async (req, res, next) => {
  try {
    const { orderStatus } = req.body;
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });

    order.orderStatus = orderStatus;
    if (orderStatus === 'Delivered') {
      order.deliveredAt = new Date();
      order.deliveryInfoEditCount = 0;
    }
    await order.save();

    await order.populate('user', 'name email');

    // Send customer push notification for status update
    try {
      const pushService = require('../utils/pushService');
      const orderShortId = order._id.toString().slice(-6).toUpperCase();
      let payload = null;

      if (orderStatus === 'Confirmed') {
        payload = {
          title: 'Order Confirmed! ✅',
          body: `Your order #${orderShortId} has been confirmed. We are processing it.`,
          icon: '/favicon.ico',
          url: '/orders'
        };
      } else if (orderStatus === 'Shipped') {
        const tracking = order.deliveryInfo?.trackingNumber ? ` (Tracking: ${order.deliveryInfo.trackingNumber})` : '';
        payload = {
          title: 'Order Shipped! 🚚',
          body: `Your order #${orderShortId} has been shipped!${tracking}`,
          icon: '/favicon.ico',
          url: '/orders'
        };
      } else if (orderStatus === 'Delivered') {
        payload = {
          title: 'Order Delivered! 🎉',
          body: `Your order #${orderShortId} has been delivered. Thank you!`,
          icon: '/favicon.ico',
          url: '/orders'
        };
      }

      if (payload) {
        pushService.sendToUser(order.user._id, payload).catch(err => console.error("Customer push notification failed:", err));
      }
    } catch (pushErr) {
      console.error("Push notification error in updateOrderStatus:", pushErr.message);
    }

    res.status(200).json(order);
  } catch (error) {
    next(error);
  }
};

// Admin updates delivery info
exports.updateDeliveryInfo = async (req, res, next) => {
  try {
    const { receivingSpot, deliveryBoyPhone, deliveryBoyName, deliveryNotes, trackingNumber } = req.body;

    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });

    const allowedStatuses = ['Paid', 'Confirmed', 'Shipped', 'Delivered'];
    if (!allowedStatuses.includes(order.orderStatus)) {
      return res.status(400).json({ message: 'Can only update delivery info for paid/confirmed/shipped/delivered orders' });
    }

    if (order.orderStatus === 'Delivered') {
      if (order.deliveredAt && (Date.now() - new Date(order.deliveredAt).getTime()) > 2 * 60 * 60 * 1000) {
        return res.status(400).json({ message: 'Edit window expired (2 hours after delivery)' });
      }
      if (order.deliveryInfoEditCount >= 2) {
        return res.status(400).json({ message: 'Edit limit reached (max 2 edits after delivery)' });
      }
      order.deliveryInfoEditCount = (order.deliveryInfoEditCount || 0) + 1;
    }

    order.deliveryInfo = {
      receivingSpot: receivingSpot || order.deliveryInfo?.receivingSpot || '',
      deliveryBoyPhone: deliveryBoyPhone || order.deliveryInfo?.deliveryBoyPhone || '',
      deliveryBoyName: deliveryBoyName || order.deliveryInfo?.deliveryBoyName || '',
      deliveryNotes: deliveryNotes || order.deliveryInfo?.deliveryNotes || '',
      trackingNumber: trackingNumber || order.deliveryInfo?.trackingNumber || '',
    };
    await order.save();

    res.status(200).json({ message: 'Delivery info updated', order });
  } catch (error) {
    next(error);
  }
};

// --- CUSTOMER MANAGEMENT ---

exports.getCustomers = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, search } = req.query;
    const query = {};
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { businessName: { $regex: search, $options: 'i' } },
        { businessLocation: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [customers, total] = await Promise.all([
      User.find(query).select('-password').sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
      User.countDocuments(query),
    ]);

    res.status(200).json({ customers, totalPages: Math.ceil(total / Number(limit)), total });
  } catch (error) {
    next(error);
  }
};

exports.createCustomer = async (req, res, next) => {
  try {
    const { name, phone, email, password, businessName, businessLocation, gstNumber } = req.body;

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ message: 'A customer with this email already exists' });
    }

    const customer = await User.create({
      name,
      phone,
      email: email.toLowerCase(),
      password,
      businessName: businessName || '',
      businessLocation: businessLocation || '',
      gstNumber: gstNumber || '',
      verified: false
    });

    res.status(201).json({
      message: 'Customer account created successfully',
      customer: {
        _id: customer._id,
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        businessName: customer.businessName,
        businessLocation: customer.businessLocation,
        gstNumber: customer.gstNumber,
        verified: customer.verified
      }
    });
  } catch (error) {
    next(error);
  }
};

exports.updateCustomer = async (req, res, next) => {
  try {
    const { name, phone, email, password, businessName, businessLocation, gstNumber } = req.body;
    
    const customer = await User.findById(req.params.id);
    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    if (email && email.toLowerCase() !== customer.email.toLowerCase()) {
      const emailExists = await User.findOne({ email: email.toLowerCase() });
      if (emailExists) {
        return res.status(400).json({ message: 'Email already in use' });
      }
      customer.email = email.toLowerCase();
    }

    if (name) customer.name = name;
    if (phone) customer.phone = phone;
    if (businessName !== undefined) customer.businessName = businessName;
    if (businessLocation !== undefined) customer.businessLocation = businessLocation;
    if (gstNumber !== undefined) customer.gstNumber = gstNumber;
    if (password) customer.password = password;

    await customer.save();

    res.status(200).json({
      message: 'Customer updated successfully',
      customer: {
        _id: customer._id,
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        businessName: customer.businessName,
        businessLocation: customer.businessLocation,
        gstNumber: customer.gstNumber,
        verified: customer.verified
      }
    });
  } catch (error) {
    next(error);
  }
};

exports.deleteCustomer = async (req, res, next) => {
  try {
    const customer = await User.findByIdAndDelete(req.params.id);
    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }
    res.status(200).json({ message: 'Customer deleted successfully' });
  } catch (error) {
    next(error);
  }
};

exports.getCustomerOrders = async (req, res, next) => {
  try {
    const orders = await Order.find({ user: req.params.id }).sort({ createdAt: -1 });
    res.status(200).json(orders);
  } catch (error) {
    next(error);
  }
};

// --- ADMIN SETTINGS / SEED ---

exports.seedAdmin = async (req, res, next) => {
  try {
    const existing = await Admin.findOne({ email: 'admin@rbw.com' });
    if (existing) return res.status(200).json({ message: 'Admin already exists' });

    await Admin.create({
      name: 'RBW Admin',
      email: 'admin@rbw.com',
      password: 'admin123456',
      role: 'superadmin',
    });
    res.status(201).json({ message: 'Admin created — email: admin@rbw.com, password: admin123456' });
  } catch (error) {
    next(error);
  }
};

// Deliver order and notify customer with PDF bill
exports.deliverAndNotifyOrder = async (req, res, next) => {
  try {
    const { receivingSpot, deliveryBoyPhone, deliveryBoyName, deliveryNotes, trackingNumber } = req.body;

    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });

    // Allowed status transition
    const allowedStatuses = ['Paid', 'Confirmed', 'Shipped', 'Delivered'];
    if (!allowedStatuses.includes(order.orderStatus)) {
      return res.status(400).json({ message: 'Cannot deliver order in current status' });
    }

    // Update delivery details and mark as Delivered
    order.deliveryInfo = {
      receivingSpot: receivingSpot || order.deliveryInfo?.receivingSpot || '',
      deliveryBoyPhone: deliveryBoyPhone || order.deliveryInfo?.deliveryBoyPhone || '',
      deliveryBoyName: deliveryBoyName || order.deliveryInfo?.deliveryBoyName || '',
      deliveryNotes: deliveryNotes || order.deliveryInfo?.deliveryNotes || '',
      trackingNumber: trackingNumber || order.deliveryInfo?.trackingNumber || '',
    };
    order.orderStatus = 'Delivered';
    order.deliveredAt = new Date();
    order.deliveryInfoEditCount = 0;
    await order.save();

    // Send customer push notification for delivery
    try {
      const pushService = require('../utils/pushService');
      const orderShortId = order._id.toString().slice(-6).toUpperCase();
      const payload = {
        title: 'Order Delivered! 🎉',
        body: `Your order #${orderShortId} has been delivered. Thank you!`,
        icon: '/favicon.ico',
        url: '/orders'
      };
      pushService.sendToUser(order.user, payload).catch(err => console.error("Customer push notification failed:", err));
    } catch (pushErr) {
      console.error("Push notification error in deliverAndNotifyOrder:", pushErr.message);
    }

    // Generate Invoice PDF
    let pdfBuffer;
    try {
      pdfBuffer = await generateInvoicePDF(order);
    } catch (pdfErr) {
      console.error('Invoice PDF generation failed:', pdfErr.message);
      return res.status(500).json({ message: 'Failed to generate invoice PDF', error: pdfErr.message });
    }

    // Send delivered email with PDF attachment
    try {
      await sendOrderDeliveredEmailWithPdf(order.shippingAddress.email, order, pdfBuffer);
    } catch (emailErr) {
      console.error('Delivered notification email failed:', emailErr.message);
      // We don't fail the whole request, but report it
      return res.status(200).json({ 
        message: 'Order status set to Delivered, but email sending failed', 
        order,
        emailError: emailErr.message 
      });
    }

    res.status(200).json({ message: 'Order marked as Delivered and email notification sent', order });
  } catch (error) {
    next(error);
  }
};

// --- GALLERY MANAGEMENT ---

// Get all gallery photos (also public)
exports.getGalleryPhotos = async (req, res, next) => {
  try {
    const photos = await Gallery.find().sort({ createdAt: -1 });
    res.status(200).json(photos);
  } catch (error) {
    next(error);
  }
};

// Upload gallery photo
exports.uploadGalleryPhoto = async (req, res, next) => {
  try {
    const { title, description } = req.body;
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'Please upload an image file' });
    }

    const image = {
      url: req.files[0].path,
      publicId: req.files[0].filename,
    };

    const photo = await Gallery.create({
      image,
      title: title || '',
      description: description || '',
    });

    res.status(201).json(photo);
  } catch (error) {
    next(error);
  }
};

// Delete gallery photo
exports.deleteGalleryPhoto = async (req, res, next) => {
  try {
    const photo = await Gallery.findById(req.params.id);
    if (!photo) return res.status(404).json({ message: 'Gallery photo not found' });

    // Delete from Cloudinary
    if (photo.image?.publicId) {
      try {
        await cloudinary.uploader.destroy(photo.image.publicId);
      } catch (err) {
        console.error('Cloudinary delete error for gallery photo:', err.message);
      }
    }

    await Gallery.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: 'Gallery photo deleted successfully' });
  } catch (error) {
    next(error);
  }
};
