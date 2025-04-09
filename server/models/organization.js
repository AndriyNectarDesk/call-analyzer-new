const mongoose = require('mongoose');

const OrganizationSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  code: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  description: String,
  contactEmail: {
    type: String,
    required: true,
    trim: true,
    lowercase: true
  },
  active: {
    type: Boolean,
    default: true
  },
  subscriptionTier: {
    type: String,
    enum: ['free', 'basic', 'pro', 'enterprise'],
    default: 'free'
  },
  subscriptionStatus: {
    type: String,
    enum: ['active', 'trial', 'expired', 'cancelled'],
    default: 'trial'
  },
  subscriptionPeriod: {
    startDate: Date,
    endDate: Date,
    trialEndDate: Date
  },
  billingInfo: {
    companyName: String,
    address: String,
    city: String,
    state: String,
    zipCode: String,
    country: String,
    vatNumber: String
  },
  features: {
    maxUsers: {
      type: Number,
      default: 1
    },
    maxTranscripts: {
      type: Number,
      default: 10
    },
    apiAccess: {
      type: Boolean,
      default: false
    },
    customBranding: {
      type: Boolean,
      default: false
    },
    advancedAnalytics: {
      type: Boolean,
      default: false
    }
  },
  apiKeys: [{
    name: String,
    key: String,
    secret: String,
    createdAt: Date,
    lastUsed: Date,
    isActive: {
      type: Boolean,
      default: true
    }
  }],
  settings: {
    theme: {
      type: String,
      default: 'light'
    },
    timezone: {
      type: String,
      default: 'UTC'
    },
    language: {
      type: String,
      default: 'en'
    },
    notifications: {
      email: {
        type: Boolean,
        default: true
      },
      slack: {
        type: Boolean,
        default: false
      }
    }
  },
  usageStats: {
    totalTranscripts: {
      type: Number,
      default: 0
    },
    totalUsers: {
      type: Number,
      default: 0
    },
    lastActive: Date,
    apiCalls: {
      type: Number,
      default: 0
    }
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update the updatedAt timestamp before saving
OrganizationSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Indexes for faster queries
OrganizationSchema.index({ code: 1 });
OrganizationSchema.index({ active: 1 });
OrganizationSchema.index({ subscriptionTier: 1 });
OrganizationSchema.index({ subscriptionStatus: 1 });
OrganizationSchema.index({ 'subscriptionPeriod.endDate': 1 });

module.exports = mongoose.model('Organization', OrganizationSchema); 