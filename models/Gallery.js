const mongoose = require('mongoose');

const gallerySchema = new mongoose.Schema({
  image: {
    url: {
      type: String,
      required: [true, 'Image URL is required'],
    },
    publicId: {
      type: String,
      required: [true, 'Image public ID is required'],
    },
  },
  title: {
    type: String,
    trim: true,
  },
  description: {
    type: String,
    trim: true,
  },
}, {
  timestamps: true,
});

module.exports = mongoose.model('Gallery', gallerySchema);
