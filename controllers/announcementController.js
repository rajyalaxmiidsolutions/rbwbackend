const Announcement = require('../models/Announcement');

// Public: Get all active announcements (current date is between startDate and endDate)
exports.getActiveAnnouncements = async (req, res, next) => {
  try {
    const now = new Date();
    const announcements = await Announcement.find({
      startDate: { $lte: now },
      endDate: { $gte: now }
    }).sort({ createdAt: -1 });
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
    const { message, displayPages, startDate, endDate } = req.body;
    const announcement = await Announcement.create({
      message,
      displayPages,
      startDate,
      endDate
    });
    res.status(201).json(announcement);
  } catch (error) {
    next(error);
  }
};

// Admin: Update announcement
exports.updateAnnouncement = async (req, res, next) => {
  try {
    const { message, displayPages, startDate, endDate } = req.body;
    const announcement = await Announcement.findByIdAndUpdate(
      req.params.id,
      { message, displayPages, startDate, endDate },
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
