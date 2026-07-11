const express = require('express');
const router = express.Router();
const adminAuth = require('../middleware/adminAuth');
const upload = require('../middleware/upload');
const { authLimiter } = require('../middleware/rateLimiter');
const admin = require('../controllers/adminController');

// Public
router.post('/login', authLimiter, admin.login);
router.post('/seed', admin.seedAdmin);

// Protected
router.use(adminAuth);
router.get('/dashboard', admin.getDashboard);

// Products
router.get('/products', admin.getAllProducts);
router.post('/products', upload.array('images', 10), admin.createProduct);
router.put('/products/:id', upload.array('images', 10), admin.updateProduct);
router.delete('/products/:id', admin.deleteProduct);

// Categories
router.post('/categories', upload.array('images', 1), admin.createCategory);
router.put('/categories/:id', upload.array('images', 1), admin.updateCategory);
router.delete('/categories/:id', admin.deleteCategory);
router.put('/categories/:id/featured', admin.toggleFeatured);

// Locations
router.get('/locations', admin.getLocations);
router.post('/locations', admin.createLocation);
router.put('/locations/:id', admin.updateLocation);
router.delete('/locations/:id', admin.deleteLocation);

// Testimonials
router.get('/testimonials', admin.getTestimonials);
router.post('/testimonials', admin.createTestimonial);
router.put('/testimonials/:id', admin.updateTestimonial);
router.delete('/testimonials/:id', admin.deleteTestimonial);

// Orders
router.get('/orders', admin.getAllOrders);
router.put('/orders/:id', admin.updateOrderStatus);
router.put('/orders/:id/delivery-info', admin.updateDeliveryInfo);
router.put('/orders/:id/deliver-and-notify', admin.deliverAndNotifyOrder);

// Gallery
router.get('/gallery', admin.getGalleryPhotos);
router.post('/gallery', upload.array('images', 1), admin.uploadGalleryPhoto);
router.delete('/gallery/:id', admin.deleteGalleryPhoto);

// Customers
router.get('/customers', admin.getCustomers);
router.post('/customers', admin.createCustomer);
router.put('/customers/:id', admin.updateCustomer);
router.delete('/customers/:id', admin.deleteCustomer);
router.get('/customers/:id/orders', admin.getCustomerOrders);

module.exports = router;
