const mongoose = require('mongoose');

const TranscriptSchema = new mongoose.Schema({
  rawTranscript: {
    type: String,
    required: true
  },
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true,
    index: true
  },
  analysis: {
    callSummary: mongoose.Schema.Types.Mixed,
    agentPerformance: {
      strengths: [String],
      areasForImprovement: [String]
    },
    improvementSuggestions: [String],
    scorecard: {
      customerService: Number,
      productKnowledge: Number,
      processEfficiency: Number,
      problemSolving: Number,
      overallScore: Number
    }
  },
  callType: {
    type: String,
    default: 'auto'
  },
  source: {
    type: String,
    enum: ['web', 'api', 'audio', 'nectar-desk-webhook'],
    default: 'web'
  },
  // Enhanced call metadata for Nectar Desk
  callDetails: {
    callId: String,
    callDirection: {
      type: String,
      enum: ['inbound', 'outbound', null],
      default: null
    },
    duration: Number,
    talkTime: Number,
    waitingTime: Number,
    startedDate: Date,
    endedDate: Date,
    tags: [String],
    callStatus: String,
    campaign: String,
    abandoned: Number,
    disposition: {
      code: String
    },
    external_numbers: [String],
    transfer_details: mongoose.Schema.Types.Mixed,
    number: {
      id: String,
      number: String,
      alias: String
    },
    customer: {
      id: String,
      firstName: String,
      lastName: String,
      email: String,
      phone: String,
      createDate: Date,
      additionalFields: mongoose.Schema.Types.Mixed
    },
    agent: mongoose.Schema.Types.Mixed
  },
  metadata: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
    default: {}
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Add compound index for organization + creation date for efficient queries
TranscriptSchema.index({ organizationId: 1, createdAt: -1 });

module.exports = mongoose.model('Transcript', TranscriptSchema);