const Announcement = require('../models/Announcement');
const cloudinary = require('../config/cloudinary');

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
    
    let parsedDisplayPages = displayPages;
    if (typeof displayPages === 'string') {
      try {
        parsedDisplayPages = JSON.parse(displayPages);
      } catch (e) {
        parsedDisplayPages = displayPages.split(',').map(p => p.trim()).filter(Boolean);
      }
    }

    let image = undefined;
    if (req.files && req.files.length > 0) {
      image = {
        url: req.files[0].path,
        publicId: req.files[0].filename,
      };
    }

    const announcement = await Announcement.create({
      message,
      displayPages: parsedDisplayPages || [],
      startDate,
      endDate,
      image
    });

    // Send push notification to all customers
    const pushService = require('../utils/pushService');
    const payload = {
      title: '📢 New Announcement from RBW',
      body: message,
      icon: '/favicon.ico',
      url: '/updates' // opens the updates page on click
    };
    pushService.sendToAllCustomers(payload).catch(err => console.error("Error sending push for announcement:", err));

    res.status(201).json(announcement);
  } catch (error) {
    next(error);
  }
};

// Admin: Update announcement
exports.updateAnnouncement = async (req, res, next) => {
  try {
    const { message, displayPages, startDate, endDate, clearImage } = req.body;
    
    const announcement = await Announcement.findById(req.params.id);
    if (!announcement) {
      return res.status(404).json({ message: 'Announcement not found' });
    }

    let parsedDisplayPages = displayPages;
    if (typeof displayPages === 'string') {
      try {
        parsedDisplayPages = JSON.parse(displayPages);
      } catch (e) {
        parsedDisplayPages = displayPages.split(',').map(p => p.trim()).filter(Boolean);
      }
    }

    announcement.message = message;
    announcement.displayPages = parsedDisplayPages || [];
    announcement.startDate = startDate;
    announcement.endDate = endDate;

    if (req.files && req.files.length > 0) {
      // Destroy old Cloudinary image
      if (announcement.image && announcement.image.publicId) {
        try {
          await cloudinary.uploader.destroy(announcement.image.publicId);
        } catch (err) {
          console.error('Cloudinary destroy error:', err.message);
        }
      }
      announcement.image = {
        url: req.files[0].path,
        publicId: req.files[0].filename,
      };
    } else if (clearImage === 'true') {
      // Clear image
      if (announcement.image && announcement.image.publicId) {
        try {
          await cloudinary.uploader.destroy(announcement.image.publicId);
        } catch (err) {
          console.error('Cloudinary destroy error:', err.message);
        }
      }
      announcement.image = undefined;
    }

    await announcement.save();
    res.status(200).json(announcement);
  } catch (error) {
    next(error);
  }
};

// Admin: Delete announcement
exports.deleteAnnouncement = async (req, res, next) => {
  try {
    const announcement = await Announcement.findById(req.params.id);
    if (!announcement) {
      return res.status(404).json({ message: 'Announcement not found' });
    }

    // Delete image from Cloudinary
    if (announcement.image && announcement.image.publicId) {
      try {
        await cloudinary.uploader.destroy(announcement.image.publicId);
      } catch (err) {
        console.error('Cloudinary destroy error for deleted announcement:', err.message);
      }
    }

    await Announcement.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: 'Announcement deleted successfully' });
  } catch (error) {
    next(error);
  }
};
