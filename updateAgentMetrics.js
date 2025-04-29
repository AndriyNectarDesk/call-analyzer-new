/**
 * Script to manually update agent performance metrics for Beltone organization
 * This will calculate metrics from transcripts and update the Agent records
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Agent = require('./server/models/agent');
const Transcript = require('./server/models/transcript');
const { ObjectId } = mongoose.Types;

// Beltone organization ID
const BELTONE_ORG_ID = '6803d34e2ee3fb8ef1971aac';

// Connection URI
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://callanalyzer:callanalyzer%40123@callanalyzer.0bi3jhc.mongodb.net/?retryWrites=true&w=majority&appName=CallAnalyzer';

async function updateBeltoneAgentMetrics() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI, { dbName: 'test' });
    console.log('Connected successfully to MongoDB');
    
    // First, verify the Beltone organization exists
    console.log(`Checking organization with ID: ${BELTONE_ORG_ID}`);
    
    // Find all agents for Beltone
    const agents = await Agent.find({
      organizationId: new ObjectId(BELTONE_ORG_ID)
    });
    
    console.log(`Found ${agents.length} agents for Beltone organization`);
    
    // Find if we have any transcripts for these agents
    const agentIds = agents.map(agent => agent._id);
    
    const transcriptCounts = await Transcript.aggregate([
      { $match: { 
        $or: [
          { agentId: { $in: agentIds } },
          { organizationId: new ObjectId(BELTONE_ORG_ID) }
        ]
      }},
      { $group: {
        _id: "$agentId",
        count: { $sum: 1 }
      }}
    ]);
    
    console.log('Transcript counts by agent:');
    console.log(transcriptCounts);
    
    // Go through each agent and update metrics
    let updatedCount = 0;
    
    for (const agent of agents) {
      console.log(`Processing agent ${agent._id} (externalId: ${agent.externalId || 'N/A'})`);
      
      // Find all transcripts for this agent
      const transcripts = await Transcript.find({
        agentId: agent._id
      });
      
      if (transcripts.length === 0) {
        console.log(`No transcripts found for agent ${agent._id}, trying to find by organization and agent info`);
        
        // Try to find transcripts using agent information
        const query = {
          organizationId: new ObjectId(BELTONE_ORG_ID),
          'callDetails.agent': { $exists: true }
        };
        
        // Add identifiers if available
        if (agent.externalId) {
          query['callDetails.agent.id'] = agent.externalId.toString();
        }
        
        const orgTranscripts = await Transcript.find(query).limit(10);
        console.log(`Found ${orgTranscripts.length} organization transcripts that might match`);
        
        // Link these transcripts to the agent
        if (orgTranscripts.length > 0) {
          for (const transcript of orgTranscripts) {
            transcript.agentId = agent._id;
            await transcript.save();
            console.log(`Linked transcript ${transcript._id} to agent ${agent._id}`);
          }
        }
      }
      
      // Recalculate performance metrics
      await updateAgentPerformanceMetrics(agent);
      updatedCount++;
    }
    
    console.log(`Updated metrics for ${updatedCount} agents`);
    
  } catch (error) {
    console.error('Error updating agent metrics:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

/**
 * Calculate and update performance metrics for a specific agent
 */
async function updateAgentPerformanceMetrics(agent) {
  try {
    // Get all transcripts for this agent
    const transcripts = await Transcript.find({
      agentId: agent._id
    });
    
    console.log(`Found ${transcripts.length} transcripts for agent ${agent._id}`);
    
    if (transcripts.length === 0) {
      return;
    }
    
    // Calculate performance metrics
    const metrics = {
      callCount: transcripts.length,
      averageScores: {
        customerService: 0,
        productKnowledge: 0,
        processEfficiency: 0,
        problemSolving: 0,
        overallScore: 0
      },
      avgCallDuration: 0,
      avgTalkTime: 0,
      avgWaitingTime: 0,
      commonStrengths: new Map(),
      commonAreasForImprovement: new Map()
    };
    
    // Aggregate metrics
    let scoreCount = 0;
    let durationCount = 0;
    let talkTimeCount = 0;
    let waitTimeCount = 0;
    
    transcripts.forEach(transcript => {
      // Aggregate scores
      if (transcript.analysis && transcript.analysis.scorecard) {
        const scorecard = transcript.analysis.scorecard;
        
        if (typeof scorecard.customerService === 'number') {
          metrics.averageScores.customerService += scorecard.customerService;
        }
        if (typeof scorecard.productKnowledge === 'number') {
          metrics.averageScores.productKnowledge += scorecard.productKnowledge;
        }
        if (typeof scorecard.processEfficiency === 'number') {
          metrics.averageScores.processEfficiency += scorecard.processEfficiency;
        }
        if (typeof scorecard.problemSolving === 'number') {
          metrics.averageScores.problemSolving += scorecard.problemSolving;
        }
        if (typeof scorecard.overallScore === 'number') {
          metrics.averageScores.overallScore += scorecard.overallScore;
        }
        
        scoreCount++;
      }
      
      // Aggregate call metrics
      if (transcript.callDetails) {
        if (typeof transcript.callDetails.duration === 'number') {
          metrics.avgCallDuration += transcript.callDetails.duration;
          durationCount++;
        }
        
        if (typeof transcript.callDetails.talkTime === 'number') {
          metrics.avgTalkTime += transcript.callDetails.talkTime;
          talkTimeCount++;
        }
        
        if (typeof transcript.callDetails.waitingTime === 'number') {
          metrics.avgWaitingTime += transcript.callDetails.waitingTime;
          waitTimeCount++;
        }
      }
      
      // Aggregate strengths and areas for improvement
      if (transcript.analysis && transcript.analysis.agentPerformance) {
        const { strengths, areasForImprovement } = transcript.analysis.agentPerformance;
        
        if (Array.isArray(strengths)) {
          strengths.forEach(strength => {
            metrics.commonStrengths.set(
              strength, 
              (metrics.commonStrengths.get(strength) || 0) + 1
            );
          });
        }
        
        if (Array.isArray(areasForImprovement)) {
          areasForImprovement.forEach(area => {
            metrics.commonAreasForImprovement.set(
              area, 
              (metrics.commonAreasForImprovement.get(area) || 0) + 1
            );
          });
        }
      }
    });
    
    // Calculate averages
    if (scoreCount > 0) {
      metrics.averageScores.customerService /= scoreCount;
      metrics.averageScores.productKnowledge /= scoreCount;
      metrics.averageScores.processEfficiency /= scoreCount;
      metrics.averageScores.problemSolving /= scoreCount;
      metrics.averageScores.overallScore /= scoreCount;
    }
    
    if (durationCount > 0) {
      metrics.avgCallDuration /= durationCount;
    }
    
    if (talkTimeCount > 0) {
      metrics.avgTalkTime /= talkTimeCount;
    }
    
    if (waitTimeCount > 0) {
      metrics.avgWaitingTime /= waitTimeCount;
    }
    
    // Get top 5 strengths and areas for improvement
    const topStrengths = [...metrics.commonStrengths.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(entry => entry[0]);
      
    const topAreasForImprovement = [...metrics.commonAreasForImprovement.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(entry => entry[0]);
    
    // Update agent's performance metrics
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);
    const endDate = new Date();
    const periodName = endDate.toLocaleString('default', { month: 'long', year: 'numeric' });
    
    // Update current period
    agent.performanceMetrics = agent.performanceMetrics || {};
    agent.performanceMetrics.currentPeriod = {
      startDate,
      endDate,
      callCount: metrics.callCount,
      averageScores: metrics.averageScores,
      avgCallDuration: metrics.avgCallDuration,
      avgTalkTime: metrics.avgTalkTime,
      avgWaitingTime: metrics.avgWaitingTime
    };
    
    // Save historical data
    agent.performanceMetrics.historical = agent.performanceMetrics.historical || [];
    
    const historicalEntry = {
      periodName,
      startDate,
      endDate,
      callCount: metrics.callCount,
      averageScores: metrics.averageScores,
      avgCallDuration: metrics.avgCallDuration,
      avgTalkTime: metrics.avgTalkTime,
      avgWaitingTime: metrics.avgWaitingTime,
      commonStrengths: topStrengths,
      commonAreasForImprovement: topAreasForImprovement
    };
    
    // Add to the beginning of the array
    agent.performanceMetrics.historical.unshift(historicalEntry);
    
    // Limit the number of historical entries to keep
    if (agent.performanceMetrics.historical.length > 12) {
      agent.performanceMetrics.historical = agent.performanceMetrics.historical.slice(0, 12);
    }
    
    // Save the agent
    await agent.save();
    console.log(`Updated performance metrics for agent ${agent._id}`);
    
  } catch (error) {
    console.error(`Error updating performance metrics for agent ${agent._id}:`, error);
  }
}

// Run the function
updateBeltoneAgentMetrics(); 