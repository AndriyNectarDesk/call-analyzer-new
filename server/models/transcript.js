const mongoose = require('mongoose');

const TranscriptSchema = new mongoose.Schema({
  rawTranscript: {
    type: String,
    required: true
  },
  analysis: {
    callSummary: {
      customerName: String,
      orderType: String,
      deliveryAddress: String,
      totalValue: String,
      specialInstructions: String
    },
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
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Transcript', TranscriptSchema);