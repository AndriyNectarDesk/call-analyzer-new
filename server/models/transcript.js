const mongoose = require('mongoose');

const TranscriptSchema = new mongoose.Schema({
  rawTranscript: {
    type: String,
    required: true
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
    enum: ['web', 'api'],
    default: 'web'
  },
  metadata: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
    default: {}
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Transcript', TranscriptSchema);