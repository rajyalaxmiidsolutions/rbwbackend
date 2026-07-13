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
    res.status(200).json({ token, admin: { _id: admin._id, name: admin.name, email: admin.email, role: admin.role } });
  } catch (error) {
    next(error);
  }
};

// Dashboard stats
exports.getDashboard = async (req, res, next) => {
  try {
    const [totalProducts, totalOrders, totalCustomers, totalRevenue, recentOrders] = await Promise.all([
      Product.countDocuments(),
      Order.countDocuments(),
      User.countDocuments({ verified: true }),
      Order.aggregate([
        { $match: { orderStatus: { $ne: 'Cancelled' } } },
        { $group: { _id: null, total: { $sum: '$totalPrice' } } },
      ]),
      Order.find().populate('user', 'name email').sort({ createdAt: -1 }).limit(10),
    ]);

    res.status(200).json({
      totalProducts,
      totalOrders,
      totalCustomers,
      totalRevenue: totalRevenue[0]?.total || 0,
      recentOrders,
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
    const { page = 1, limit = 20, status, search } = req.query;
    const query = {};
    if (status) query.orderStatus = status;

    const skip = (Number(page) - 1) * Number(limit);

    let orders = Order.find(query).populate('user', 'name email phone businessName').sort({ createdAt: -1 });

    const [results, total] = await Promise.all([
      orders.skip(skip).limit(Number(limit)),
      Order.countDocuments(query),
    ]);

    res.status(200).json({ orders: results, totalPages: Math.ceil(total / Number(limit)), total });
  } catch (error) {
    next(error);
  }
};

exports.updateOrderStatus = async (req, res, next) => {
  try {
    const { orderStatus } = req.body;
    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { orderStatus },
      { new: true }
    ).populate('user', 'name email');

    if (!order) return res.status(404).json({ message: 'Order not found' });
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

    const allowedStatuses = ['Paid', 'Confirmed', 'Shipped'];
    if (!allowedStatuses.includes(order.orderStatus)) {
      return res.status(400).json({ message: 'Can only update delivery info for paid/confirmed/shipped orders' });
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
    await order.save();

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
