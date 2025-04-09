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
    trim: true,
    lowercase: true
  },
  active: {
    type: Boolean,
    default: true
  },
  subscriptionTier: {
    type: String,
    enum: ['basic', 'professional', 'enterprise'],
    default: 'basic'
  },
  features: {
    maxUsers: { type: Number, default: 5 },
    maxStorageGB: { type: Number, default: 10 },
    allowedCallTypes: [String],
    customBranding: { type: Boolean, default: false }
  },
  apiKeys: [{
    key: String,
    name: String,
    created: { type: Date, default: Date.now },
    lastUsed: Date
  }],
  settings: {
    defaultCallType: { type: String, default: 'auto' },
    retentionDays: { type: Number, default: 90 }
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

// Index for faster queries
OrganizationSchema.index({ code: 1 });
OrganizationSchema.index({ active: 1 });

module.exports = mongoose.model('Organization', OrganizationSchema); 