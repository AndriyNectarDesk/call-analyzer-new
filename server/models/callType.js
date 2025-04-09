const mongoose = require('mongoose');

const CallTypeSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    trim: true,
    lowercase: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    index: true
  },
  isGlobal: {
    type: Boolean,
    default: false,
    description: "If true, this call type is available to all organizations"
  },
  promptTemplate: {
    type: String,
    required: true
  },
  jsonStructure: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  active: {
    type: Boolean,
    default: true
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

// Update the timestamp before saving
CallTypeSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Enforce unique code within an organization
CallTypeSchema.index({ code: 1, organizationId: 1 }, { unique: true });

// Global call types can't have duplicate codes
CallTypeSchema.index({ code: 1, isGlobal: 1 }, { 
  unique: true,
  partialFilterExpression: { isGlobal: true } 
});

module.exports = mongoose.model('CallType', CallTypeSchema); 