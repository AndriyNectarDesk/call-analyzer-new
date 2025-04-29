const mongoose = require('mongoose');
const Transcript = require('../models/transcript');
const AgentPerformance = require('../models/aggregates/AgentPerformance');
const Agent = require('../models/agent');

/**
 * Calculates period information based on a date and period type
 * @param {Date} date - The date to process
 * @param {String} periodType - 'daily', 'weekly', 'monthly', or 'quarterly'
 * @returns {Object} Period information
 */
const calculatePeriodInfo = (date, periodType) => {
  const year = date.getFullYear();
  const month = date.getMonth();
  const day = date.getDate();
  
  let periodKey, periodStart, periodEnd;
  
  switch (periodType) {
    case 'daily':
      periodKey = `${year}-${(month + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
      periodStart = new Date(year, month, day, 0, 0, 0);
      periodEnd = new Date(year, month, day, 23, 59, 59);
      break;
      
    case 'weekly':
      // Get the first day of the week (Sunday)
      const dayOfWeek = date.getDay();
      const diff = date.getDate() - dayOfWeek;
      const firstDayOfWeek = new Date(date);
      firstDayOfWeek.setDate(diff);
      firstDayOfWeek.setHours(0, 0, 0, 0);
      
      // Get the last day of the week (Saturday)
      const lastDayOfWeek = new Date(firstDayOfWeek);
      lastDayOfWeek.setDate(lastDayOfWeek.getDate() + 6);
      lastDayOfWeek.setHours(23, 59, 59, 999);
      
      // Calculate the week number
      const firstDayOfYear = new Date(year, 0, 1);
      const pastDaysOfYear = (firstDayOfWeek - firstDayOfYear) / 86400000;
      const weekNum = Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
      
      periodKey = `${year}-W${weekNum.toString().padStart(2, '0')}`;
      periodStart = firstDayOfWeek;
      periodEnd = lastDayOfWeek;
      break;
      
    case 'monthly':
      periodKey = `${year}-${(month + 1).toString().padStart(2, '0')}`;
      periodStart = new Date(year, month, 1);
      periodEnd = new Date(year, month + 1, 0, 23, 59, 59);
      break;
      
    case 'quarterly':
      const quarter = Math.floor(month / 3) + 1;
      periodKey = `${year}-Q${quarter}`;
      periodStart = new Date(year, (quarter - 1) * 3, 1);
      periodEnd = new Date(year, quarter * 3, 0, 23, 59, 59);
      break;
      
    default:
      throw new Error(`Unknown period type: ${periodType}`);
  }
  
  return { periodKey, periodStart, periodEnd };
};

/**
 * Updates agent performance aggregates based on new transcript data
 * @param {Object} transcript - The transcript document
 * @returns {Promise<Object>} Result of the update operation
 */
const updateAgentPerformanceAggregates = async (transcript) => {
  try {
    if (!transcript || !transcript.analysis || !transcript.analysis.scorecard) {
      console.log('Skipping aggregation for transcript without scorecard data');
      return { success: false, reason: 'no_scorecard' };
    }
    
    const { agentId, organizationId, createdAt } = transcript;
    
    if (!agentId || !mongoose.Types.ObjectId.isValid(agentId)) {
      console.log('Skipping aggregation for transcript without valid agentId');
      return { success: false, reason: 'invalid_agent_id' };
    }
    
    const agent = await Agent.findById(agentId);
    if (!agent) {
      console.log(`Agent not found for ID: ${agentId}`);
      return { success: false, reason: 'agent_not_found' };
    }
    
    const scorecard = transcript.analysis.scorecard;
    const duration = transcript.metadata?.duration || 0;
    
    // Get date from transcript
    const transcriptDate = new Date(createdAt);
    
    // Update aggregates for each period type
    const periodTypes = ['daily', 'weekly', 'monthly', 'quarterly'];
    const updates = [];
    
    for (const periodType of periodTypes) {
      const { periodKey, periodStart, periodEnd } = calculatePeriodInfo(transcriptDate, periodType);
      
      updates.push(
        AgentPerformance.findOneAndUpdate(
          {
            agentId,
            organizationId,
            periodType,
            periodKey
          },
          {
            $set: {
              periodStart,
              periodEnd,
              lastUpdated: new Date()
            },
            $inc: {
              'metrics.customerService': scorecard.customerService || 0,
              'metrics.productKnowledge': scorecard.productKnowledge || 0,
              'metrics.processEfficiency': scorecard.processEfficiency || 0,
              'metrics.problemSolving': scorecard.problemSolving || 0,
              'metrics.overallScore': scorecard.overallScore || 0,
              callCount: 1,
              totalDuration: duration
            }
          },
          {
            new: true,
            upsert: true
          }
        )
      );
    }
    
    // Execute all updates
    await Promise.all(updates);
    
    // Also update the agent document with the latest score
    await Agent.findByIdAndUpdate(agentId, {
      $set: {
        'performance.lastUpdated': new Date(),
        'performance.lastScorecard': {
          customerService: scorecard.customerService || 0,
          productKnowledge: scorecard.productKnowledge || 0,
          processEfficiency: scorecard.processEfficiency || 0,
          problemSolving: scorecard.problemSolving || 0,
          overallScore: scorecard.overallScore || 0
        }
      }
    });
    
    return { success: true, periodTypes };
  } catch (error) {
    console.error('Error updating agent performance aggregates:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Normalizes agent performance aggregates by dividing sums by call count
 * Should be run periodically to ensure averages are correct
 */
const normalizeAgentPerformanceAggregates = async () => {
  try {
    const aggregates = await AgentPerformance.find({});
    
    for (const aggregate of aggregates) {
      if (aggregate.callCount > 0) {
        // Normalize metrics by calculating averages
        aggregate.metrics.customerService /= aggregate.callCount;
        aggregate.metrics.productKnowledge /= aggregate.callCount;
        aggregate.metrics.processEfficiency /= aggregate.callCount;
        aggregate.metrics.problemSolving /= aggregate.callCount;
        aggregate.metrics.overallScore /= aggregate.callCount;
        
        // Save the normalized metrics
        await aggregate.save();
      }
    }
    
    return { success: true, count: aggregates.length };
  } catch (error) {
    console.error('Error normalizing agent performance aggregates:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Rebuilds the entire agent performance aggregate collection from scratch
 * This is useful for initial setup or if the aggregates need to be corrected
 */
const rebuildAgentPerformanceAggregates = async () => {
  try {
    // Clear existing aggregates
    await AgentPerformance.deleteMany({});
    
    // Get all transcripts with agent IDs and analyses
    const transcripts = await Transcript.find({
      agentId: { $exists: true, $ne: null },
      'analysis.scorecard': { $exists: true }
    }).sort({ createdAt: 1 });
    
    console.log(`Rebuilding aggregates for ${transcripts.length} transcripts`);
    
    // Process each transcript
    let successCount = 0;
    let errorCount = 0;
    
    for (const transcript of transcripts) {
      const result = await updateAgentPerformanceAggregates(transcript);
      if (result.success) {
        successCount++;
      } else {
        errorCount++;
      }
    }
    
    // Normalize the metrics
    await normalizeAgentPerformanceAggregates();
    
    return {
      success: true,
      totalProcessed: transcripts.length,
      successCount,
      errorCount
    };
  } catch (error) {
    console.error('Error rebuilding agent performance aggregates:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Retrieves agent performance trends from the aggregated data
 * @param {String} agentId - The agent ID
 * @param {String} organizationId - The organization ID
 * @param {String} periodType - 'weekly', 'monthly', or 'quarterly'
 * @param {Number} limit - Maximum number of periods to return
 * @returns {Promise<Array>} Agent performance trend data
 */
const getAgentPerformanceTrends = async (agentId, organizationId, periodType = 'monthly', limit = 12) => {
  try {
    // Validate inputs
    if (!mongoose.Types.ObjectId.isValid(agentId)) {
      throw new Error('Invalid agent ID');
    }
    
    if (!mongoose.Types.ObjectId.isValid(organizationId)) {
      throw new Error('Invalid organization ID');
    }
    
    // Default to monthly if invalid period type is provided
    if (!['weekly', 'monthly', 'quarterly'].includes(periodType)) {
      periodType = 'monthly';
    }
    
    // Get aggregated data for the agent
    const aggregates = await AgentPerformance.find({
      agentId,
      organizationId,
      periodType,
      callCount: { $gt: 0 }
    })
    .sort({ periodStart: -1 })
    .limit(limit);
    
    // Format the data for the client
    const trends = aggregates.map(agg => {
      // Format period label based on period type
      let periodLabel;
      const date = new Date(agg.periodStart);
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      
      switch (periodType) {
        case 'weekly':
          periodLabel = `Week ${agg.periodKey.split('-W')[1]}`;
          break;
        case 'quarterly':
          periodLabel = `Q${agg.periodKey.split('-Q')[1]} ${date.getFullYear()}`;
          break;
        case 'monthly':
        default:
          periodLabel = `${monthNames[date.getMonth()]} ${date.getFullYear()}`;
          break;
      }
      
      return {
        period: periodLabel,
        customerService: parseFloat(agg.metrics.customerService.toFixed(1)),
        productKnowledge: parseFloat(agg.metrics.productKnowledge.toFixed(1)),
        processEfficiency: parseFloat(agg.metrics.processEfficiency.toFixed(1)),
        problemSolving: parseFloat(agg.metrics.problemSolving.toFixed(1)),
        overallScore: parseFloat(agg.metrics.overallScore.toFixed(1)),
        callCount: agg.callCount
      };
    });
    
    // Reverse to get chronological order
    return trends.reverse();
  } catch (error) {
    console.error('Error getting agent performance trends:', error);
    throw error;
  }
};

module.exports = {
  updateAgentPerformanceAggregates,
  normalizeAgentPerformanceAggregates,
  rebuildAgentPerformanceAggregates,
  getAgentPerformanceTrends
}; 