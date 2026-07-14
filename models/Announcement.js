const mongoose = require('mongoose');

const announcementSchema = new mongoose.Schema({
  message: {
    type: String,
    required: [true, 'Announcement message is required'],
    trim: true,
  },
  displayPages: {
    type: [String],
    default: [],
  },
  startDate: {
    type: Date,
    required: [true, 'Start date is required'],
  },
  endDate: {
    type: Date,
    required: [true, 'End date is required'],
  },
  image: {
    url: String,
    publicId: String,
  },
}, {
  timestamps: true,
});

module.exports = mongoose.model('Announcement', announcementSchema);
