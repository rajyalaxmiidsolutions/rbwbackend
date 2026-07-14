const PushSubscription = require('../models/PushSubscription');
const pushService = require('../utils/pushService');

// Subscribe a customer
exports.subscribeCustomer = async (req, res, next) => {
  try {
    const { subscription } = req.body;
    if (!subscription || !subscription.endpoint || !subscription.keys) {
      return res.status(400).json({ message: 'Invalid subscription object' });
    }

    const userId = req.user ? req.user._id : null;

    // Check if subscription already exists
    let existingSub = await PushSubscription.findOne({ 'subscription.endpoint': subscription.endpoint });

    if (existingSub) {
      existingSub.user = userId;
      existingSub.role = 'customer';
      existingSub.isActive = true;
      await existingSub.save();
      return res.status(200).json({ message: 'Subscription updated successfully', subscription: existingSub });
    }

    const newSub = await PushSubscription.create({
      user: userId,
      role: 'customer',
      subscription,
      isActive: true
    });

    res.status(201).json({ message: 'Subscribed successfully', subscription: newSub });
  } catch (error) {
    next(error);
  }
};

// Subscribe an admin
exports.subscribeAdmin = async (req, res, next) => {
  try {
    const { subscription } = req.body;
    if (!subscription || !subscription.endpoint || !subscription.keys) {
      return res.status(400).json({ message: 'Invalid subscription object' });
    }

    const adminId = req.admin ? req.admin._id : null;

    // Check if subscription already exists
    let existingSub = await PushSubscription.findOne({ 'subscription.endpoint': subscription.endpoint });

    if (existingSub) {
      existingSub.user = adminId;
      existingSub.role = 'admin';
      existingSub.isActive = true;
      await existingSub.save();
      return res.status(200).json({ message: 'Subscription updated successfully', subscription: existingSub });
    }

    const newSub = await PushSubscription.create({
      user: adminId,
      role: 'admin',
      subscription,
      isActive: true
    });

    res.status(201).json({ message: 'Subscribed successfully', subscription: newSub });
  } catch (error) {
    next(error);
  }
};

// Unsubscribe
exports.unsubscribe = async (req, res, next) => {
  try {
    const { endpoint } = req.body;
    if (!endpoint) {
      return res.status(400).json({ message: 'Endpoint is required to unsubscribe' });
    }

    const result = await PushSubscription.findOneAndDelete({ 'subscription.endpoint': endpoint });
    
    if (!result) {
      return res.status(404).json({ message: 'Subscription not found' });
    }

    res.status(200).json({ message: 'Unsubscribed successfully' });
  } catch (error) {
    next(error);
  }
};

// Send custom notification (Admin only)
exports.sendCustomNotification = async (req, res, next) => {
  try {
    const { title, body, targetUrl } = req.body;

    if (!title || !body) {
      return res.status(400).json({ message: 'Title and body are required' });
    }

    const payload = {
      title,
      body,
      icon: '/favicon.ico', // fallback icon
      url: targetUrl || '/'
    };

    // Send to all customer subscribers
    await pushService.sendToAllCustomers(payload);

    res.status(200).json({ message: 'Custom push notification sent successfully' });
  } catch (error) {
    next(error);
  }
};

// Get subscribers count (Admin only)
exports.getPushStats = async (req, res, next) => {
  try {
    const User = require('../models/User');
    const registeredCustomers = await User.countDocuments();
    const customerCount = await PushSubscription.countDocuments({ role: 'customer', isActive: true });
    const adminCount = await PushSubscription.countDocuments({ role: 'admin', isActive: true });

    res.status(200).json({
      registeredCustomers,
      customers: customerCount,
      admins: adminCount,
      total: customerCount + adminCount
    });
  } catch (error) {
    next(error);
  }
};
