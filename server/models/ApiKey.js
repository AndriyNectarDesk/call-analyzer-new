const mongoose = require('mongoose');

const ApiKeySchema = new mongoose.Schema({
  prefix: {
    type: String,
    required: true,
    trim: true
  },
  key: {
    type: String,
    required: true,
    trim: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  deactivatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  deactivatedAt: {
    type: Date
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  lastUsed: {
    type: Date
  },
  permissions: {
    type: [String],
    default: ['read', 'write']
  }
});

// Indexes for faster lookup
ApiKeySchema.index({ prefix: 1 });
ApiKeySchema.index({ organizationId: 1, isActive: 1 });

// Don't return the actual key in query results
ApiKeySchema.set('toJSON', {
  transform: function(doc, ret) {
    // Only show first and last 4 chars of the key
    ret.key = ret.key ? `${ret.key.substring(0, 4)}...${ret.key.substring(ret.key.length - 4)}` : undefined;
    return ret;
  }
});

module.exports = mongoose.model('ApiKey', ApiKeySchema); 