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
  // Reference to the Agent model
  agentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Agent',
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
    // Keep agent field for backward compatibility
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
// Add index for agent analytics
TranscriptSchema.index({ agentId: 1, createdAt: -1 });

// Middleware to ensure backward compatibility
TranscriptSchema.pre('save', async function(next) {
  try {
    // If we have agentId but no agent data in callDetails, populate it
    if (this.agentId && (!this.callDetails.agent || Object.keys(this.callDetails.agent).length === 0)) {
      const Agent = mongoose.model('Agent');
      const agent = await Agent.findById(this.agentId).lean();
      
      if (agent) {
        this.callDetails.agent = {
          id: agent.externalId,
          firstName: agent.firstName,
          lastName: agent.lastName,
          email: agent.email
        };
      }
    }
    
    // If we have agent data in callDetails but no agentId, try to find or create agent
    if (!this.agentId && this.callDetails.agent && Object.keys(this.callDetails.agent).length > 0) {
      const Agent = mongoose.model('Agent');
      let agent;
      
      // Try to find the agent by externalId if available
      if (this.callDetails.agent.id) {
        agent = await Agent.findOne({
          organizationId: this.organizationId,
          externalId: this.callDetails.agent.id
        });
      }
      
      // If agent not found and we have enough info, create a new agent
      if (!agent && (this.callDetails.agent.firstName || this.callDetails.agent.lastName || this.callDetails.agent.email)) {
        agent = new Agent({
          organizationId: this.organizationId,
          externalId: this.callDetails.agent.id,
          firstName: this.callDetails.agent.firstName,
          lastName: this.callDetails.agent.lastName,
          email: this.callDetails.agent.email,
          status: 'active'
        });
        
        await agent.save();
      }
      
      if (agent) {
        this.agentId = agent._id;
      }
    }
    
    next();
  } catch (error) {
    next(error);
  }
});

module.exports = mongoose.model('Transcript', TranscriptSchema);