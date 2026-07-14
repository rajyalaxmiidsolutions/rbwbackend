const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const otpSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
  },
  otp: {
    type: String,
    required: true,
  },
  purpose: {
    type: String,
    enum: ['verification', 'reset', 'emergency', 'emergency_admin'],
    required: true,
  },
  failedAttempts: {
    type: Number,
    default: 0,
  },
  expiresAt: {
    type: Date,
    required: true,
    index: { expires: 0 },  // TTL index — auto-deletes expired OTPs
  },
}, {
  timestamps: true,
});

// Hash OTP before saving
otpSchema.pre('save', async function (next) {
  if (!this.isModified('otp')) return next();
  this.otp = await bcrypt.hash(this.otp, 10);
  next();
});

// Compare OTP
otpSchema.methods.compareOTP = async function (candidateOTP) {
  return await bcrypt.compare(candidateOTP, this.otp);
};

module.exports = mongoose.model('OTP', otpSchema);
