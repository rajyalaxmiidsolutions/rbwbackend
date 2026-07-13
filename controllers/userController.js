const User = require('../models/User');

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
