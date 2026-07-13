const User = require('../models/User');
const Testimonial = require('../models/Testimonial');

// Get profile
exports.getProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    res.status(200).json(user);
  } catch (error) {
    next(error);
  }
};

// Update profile
exports.updateProfile = async (req, res, next) => {
  try {
    const { name, phone, businessName, businessLocation, gstNumber } = req.body;
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { name, phone, businessName, businessLocation, gstNumber },
      { new: true, runValidators: true }
    );
    res.status(200).json(user);
  } catch (error) {
    next(error);
  }
};

// Add address
exports.addAddress = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    user.addresses.push(req.body);
    await user.save();
    res.status(200).json(user.addresses);
  } catch (error) {
    next(error);
  }
};

// Delete address
exports.deleteAddress = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    user.addresses = user.addresses.filter(
      (addr) => addr._id.toString() !== req.params.id
    );
    await user.save();
    res.status(200).json(user.addresses);
  } catch (error) {
    next(error);
  }
};

// Submit testimonial
exports.submitTestimonial = async (req, res, next) => {
  try {
    const { text, rating } = req.body;
    if (!text) {
      return res.status(400).json({ message: 'Review text is required' });
    }
    
    const user = await User.findById(req.user._id);
    
    const testimonial = await Testimonial.create({
      name: user.name,
      business: user.businessName || '',
      text,
      rating: Number(rating) || 5,
      isActive: false // Hidden by default, admin must approve/activate it
    });

    res.status(201).json({
      message: 'Thank you for your feedback! Your review has been submitted for admin approval.',
      testimonial
    });
  } catch (error) {
    next(error);
  }
};
