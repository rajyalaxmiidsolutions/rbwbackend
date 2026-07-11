const mongoose = require('mongoose');

const testimonialSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    maxlength: 100,
  },
  business: {
    type: String,
    trim: true,
    maxlength: 200,
    default: '',
  },
  text: {
    type: String,
    required: [true, 'Testimonial text is required'],
    maxlength: 500,
  },
  rating: {
    type: Number,
    default: 5,
    min: 1,
    max: 5,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
}, {
  timestamps: true,
});

module.exports = mongoose.model('Testimonial', testimonialSchema);
