const mongoose = require('mongoose');

const pushSubscriptionSchema = new mongoose.Schema({
  user: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: false 
  },
  role: { 
    type: String, 
    enum: ['customer', 'admin'], 
    default: 'customer' 
  },
  subscription: {
    endpoint: { 
      type: String, 
      required: true, 
      unique: true 
    },
    keys: {
      p256dh: { 
        type: String, 
        required: true 
      },
      auth: { 
        type: String, 
        required: true 
      }
    }
  },
  isActive: { 
    type: Boolean, 
    default: true 
  }
}, { 
  timestamps: true 
});

module.exports = mongoose.model('PushSubscription', pushSubscriptionSchema);
