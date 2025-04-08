const mongoose = require('mongoose');

const CallTypeSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true,
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
  promptTemplate: {
    type: String,
    required: true
  },
  jsonStructure: {
    callSummary: {
      type: Map,
      of: String,
      default: new Map()
    },
    instructions: {
      type: String,
      default: ''
    }
  },
  active: {
    type: Boolean,
    default: true
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
CallTypeSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('CallType', CallTypeSchema); 