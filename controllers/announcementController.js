const Announcement = require('../models/Announcement');

// Public: Get all active announcements
exports.getActiveAnnouncements = async (req, res, next) => {
  try {
    const announcements = await Announcement.find({ isActive: true }).sort({ createdAt: -1 });
    res.status(200).json(announcements);
  } catch (error) {
    next(error);
  }
};

// Admin: Get all announcements
exports.getAllAnnouncements = async (req, res, next) => {
  try {
    const announcements = await Announcement.find().sort({ createdAt: -1 });
    res.status(200).json(announcements);
  } catch (error) {
    next(error);
  }
};

// Admin: Create announcement
exports.createAnnouncement = async (req, res, next) => {
  try {
    const { text, textColor, bgColor, isActive } = req.body;
    const announcement = await Announcement.create({ text, textColor, bgColor, isActive });
    res.status(201).json(announcement);
  } catch (error) {
    next(error);
  }
};

// Admin: Update announcement
exports.updateAnnouncement = async (req, res, next) => {
  try {
    const { text, textColor, bgColor, isActive } = req.body;
    const announcement = await Announcement.findByIdAndUpdate(
      req.params.id,
      { text, textColor, bgColor, isActive },
      { new: true, runValidators: true }
    );
    if (!announcement) {
      return res.status(404).json({ message: 'Announcement not found' });
    }
    res.status(200).json(announcement);
  } catch (error) {
    next(error);
  }
};

// Admin: Delete announcement
exports.deleteAnnouncement = async (req, res, next) => {
  try {
    const announcement = await Announcement.findByIdAndDelete(req.params.id);
    if (!announcement) {
      return res.status(404).json({ message: 'Announcement not found' });
    }
    res.status(200).json({ message: 'Announcement deleted successfully' });
  } catch (error) {
    next(error);
  }
};
