const mongoose = require('mongoose');

const AgentPerformanceSchema = new mongoose.Schema({
  // References
  agentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Agent',
    required: true
  },
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true
  },
  
  // Time period
  periodType: {
    type: String,
    enum: ['daily', 'weekly', 'monthly', 'quarterly'],
    required: true
  },
  periodKey: {
    type: String,
    required: true, // e.g., '2023-01', '2023-W01', '2023-Q1'
  },
  periodStart: {
    type: Date,
    required: true
  },
  periodEnd: {
    type: Date,
    required: true
  },
  
  // Performance metrics
  metrics: {
    customerService: {
      type: Number,
      min: 0,
      max: 10,
      default: 0
    },
    productKnowledge: {
      type: Number,
      min: 0,
      max: 10,
      default: 0
    },
    processEfficiency: {
      type: Number,
      min: 0,
      max: 10,
      default: 0
    },
    problemSolving: {
      type: Number,
      min: 0,
      max: 10,
      default: 0
    },
    overallScore: {
      type: Number,
      min: 0,
      max: 10,
      default: 0
    }
  },
  
  // Additional data
  callCount: {
    type: Number,
    default: 0,
    min: 0
  },
  totalDuration: {
    type: Number,
    default: 0,
    min: 0
  },
  
  // Metadata
  lastUpdated: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Create compound indexes for efficient querying
AgentPerformanceSchema.index({ agentId: 1, periodType: 1, periodKey: 1 }, { unique: true });
AgentPerformanceSchema.index({ organizationId: 1, periodType: 1, periodStart: -1 });
AgentPerformanceSchema.index({ agentId: 1, periodStart: -1 });

module.exports = mongoose.model('AgentPerformance', AgentPerformanceSchema); 