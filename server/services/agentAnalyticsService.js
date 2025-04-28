/**
 * Agent Analytics Service
 * 
 * Provides methods for analyzing agent performance data and updating performance metrics
 */

const mongoose = require('mongoose');
const Transcript = require('../models/transcript');
const Agent = require('../models/agent');

/**
 * Calculate and update performance metrics for a specific agent
 * @param {String} agentId - The MongoDB ID of the agent
 * @param {Object} options - Options for the calculation
 * @param {Date} options.startDate - Start date for the calculation period
 * @param {Date} options.endDate - End date for the calculation period
 * @param {Boolean} options.saveHistorical - Whether to save historical data
 * @param {String} options.periodName - Name of the period (e.g., "May 2023")
 */
async function updateAgentPerformanceMetrics(agentId, options = {}) {
  try {
    const startDate = options.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // Default to last 30 days
    const endDate = options.endDate || new Date();
    const saveHistorical = options.saveHistorical || false;
    const periodName = options.periodName || `${startDate.toLocaleString('default', { month: 'short' })} ${startDate.getFullYear()}`;
    
    // Find the agent
    const agent = await Agent.findById(agentId);
    if (!agent) {
      throw new Error(`Agent with ID ${agentId} not found`);
    }
    
    // Get all transcripts for this agent in the given time period
    const transcripts = await Transcript.find({
      agentId: agent._id,
      createdAt: { $gte: startDate, $lte: endDate }
    });
    
    if (transcripts.length === 0) {
      console.log(`No transcripts found for agent ${agent._id} in the specified period`);
      return null;
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
    agent.performanceMetrics.currentPeriod = {
      startDate,
      endDate,
      callCount: metrics.callCount,
      averageScores: metrics.averageScores,
      avgCallDuration: metrics.avgCallDuration,
      avgTalkTime: metrics.avgTalkTime,
      avgWaitingTime: metrics.avgWaitingTime
    };
    
    // Save historical data if requested
    if (saveHistorical) {
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
    }
    
    await agent.save();
    return agent.performanceMetrics;
  } catch (error) {
    console.error('Error updating agent performance metrics:', error);
    throw error;
  }
}

/**
 * Get performance data for all agents in an organization
 * @param {String} organizationId - The organization ID
 * @param {Object} options - Filter options
 * @param {Date} options.startDate - Start date for filtering
 * @param {Date} options.endDate - End date for filtering
 * @param {Number} options.limit - Maximum number of agents to return
 * @param {String} options.sortBy - Field to sort by
 * @param {Boolean} options.ascending - Sort in ascending order
 * @returns {Array} - Array of agent performance data
 */
async function getOrganizationAgentPerformance(organizationId, options = {}) {
  try {
    const {
      startDate,
      endDate,
      limit = 100,
      sortBy = 'performanceMetrics.currentPeriod.averageScores.overallScore',
      ascending = false
    } = options;
    
    // Base query for agents in this organization
    const query = { organizationId };
    
    // Add status filter if provided
    if (options.status) {
      query.status = options.status;
    }
    
    // Get agents with performance metrics
    const agents = await Agent.find(query)
      .sort({ [sortBy]: ascending ? 1 : -1 })
      .limit(limit);
    
    // Return formatted data
    return agents.map(agent => ({
      _id: agent._id,
      externalId: agent.externalId,
      name: `${agent.firstName || ''} ${agent.lastName || ''}`.trim(),
      email: agent.email,
      department: agent.department,
      position: agent.position,
      status: agent.status,
      performanceMetrics: agent.performanceMetrics
    }));
  } catch (error) {
    console.error('Error getting organization agent performance:', error);
    throw error;
  }
}

/**
 * Update performance metrics for all agents in an organization
 * @param {String} organizationId - The organization ID
 * @param {Object} options - Options for the calculation
 */
async function updateAllAgentMetrics(organizationId, options = {}) {
  try {
    // Get all active agents in the organization
    const agents = await Agent.find({
      organizationId,
      status: 'active'
    });
    
    console.log(`Updating metrics for ${agents.length} agents in organization ${organizationId}`);
    
    // Update metrics for each agent
    for (const agent of agents) {
      await updateAgentPerformanceMetrics(agent._id, options);
      console.log(`Updated metrics for agent ${agent._id}`);
    }
    
    return { success: true, agentsUpdated: agents.length };
  } catch (error) {
    console.error('Error updating all agent metrics:', error);
    throw error;
  }
}

module.exports = {
  updateAgentPerformanceMetrics,
  getOrganizationAgentPerformance,
  updateAllAgentMetrics
}; 