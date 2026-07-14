const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const adminSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: 6,
    select: false,
  },
  role: {
    type: String,
    default: 'admin',
    enum: ['admin', 'superadmin'],
  },
  phone: {
    type: String,
    default: () => process.env.BOSS_ADMIN_PHONE || '',
  },
  otpEnabled: {
    type: Boolean,
    default: true,
  },
  emergencyApproverEmail: {
    type: String,
    default: () => process.env.EMERGENCY_APPROVER_EMAIL || '',
  },
  maintenanceMode: {
    type: Boolean,
    default: false,
  },
  maintenanceMessage: {
    type: String,
    default: 'We are temporarily unable to accept new orders. Please try again later.',
  },
  activeDevices: [{
    token: { type: String, required: true },
    deviceInfo: { type: String, default: 'Unknown Device' },
    ip: { type: String, default: '' },
    lastActive: { type: Date, default: Date.now },
  }],
}, {
  timestamps: true,
});

adminSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

adminSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('Admin', adminSchema);
