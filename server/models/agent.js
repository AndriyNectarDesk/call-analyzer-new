const mongoose = require('mongoose');

const AgentSchema = new mongoose.Schema({
  // Basic agent information
  externalId: {
    type: String,
    index: true
  },
  firstName: String,
  lastName: String,
  email: String,
  phone: String,
  
  // Agent metadata
  department: String,
  position: String,
  hireDate: Date,
  status: {
    type: String,
    enum: ['active', 'inactive', 'training', 'terminated'],
    default: 'active'
  },
  
  // Organization relationship
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
    index: true
  },
  
  // Extended agent info
  skills: [String],
  primaryTeam: String,
  supervisor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  // Performance metrics (periodically updated)
  performanceMetrics: {
    // Current period metrics
    currentPeriod: {
      startDate: Date,
      endDate: Date,
      callCount: {
        type: Number,
        default: 0
      },
      averageScores: {
        customerService: Number,
        productKnowledge: Number,
        processEfficiency: Number,
        problemSolving: Number,
        overallScore: Number
      },
      avgCallDuration: Number,
      avgTalkTime: Number,
      avgWaitingTime: Number
    },
    // Historical data (by period)
    historical: [{
      periodName: String,
      startDate: Date,
      endDate: Date,
      callCount: Number,
      averageScores: {
        customerService: Number,
        productKnowledge: Number,
        processEfficiency: Number,
        problemSolving: Number,
        overallScore: Number
      },
      avgCallDuration: Number,
      avgTalkTime: Number,
      avgWaitingTime: Number,
      // Common strengths and areas for improvement during this period
      commonStrengths: [String],
      commonAreasForImprovement: [String]
    }]
  },
  
  // Additional custom fields
  metadata: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
    default: {}
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

// Create indexes for efficient queries
AgentSchema.index({ organizationId: 1, status: 1 });
AgentSchema.index({ organizationId: 1, externalId: 1 }, { unique: true, sparse: true });

// Update timestamps on save
AgentSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Agent', AgentSchema); 