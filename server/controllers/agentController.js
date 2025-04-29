const mongoose = require('mongoose');
const Agent = require('../models/agent');
const Transcript = require('../models/transcript');
const Organization = require('../models/organization');

// Get performance trends for an agent over time
exports.getAgentPerformanceTrends = async (req, res) => {
  try {
    const agentId = req.params.id;
    const periodType = req.query.periodType || 'monthly'; // weekly, monthly, quarterly
    
    // Validate agent ID
    if (!mongoose.Types.ObjectId.isValid(agentId)) {
      return res.status(400).json({ message: 'Invalid agent ID format' });
    }
    
    // Filter by organization ID from authenticated user or request
    const organizationId = req.tenantId || req.user.organizationId;
    
    // Ensure the user has access to this agent
    const agent = await Agent.findOne({ 
      _id: agentId,
      organizationId
    });
    
    if (!agent) {
      return res.status(404).json({ message: 'Agent not found or you do not have access' });
    }
    
    // Determine time range based on periodType
    let groupByFormat;
    let startDate;
    const endDate = new Date();
    
    switch (periodType) {
      case 'weekly':
        startDate = new Date();
        startDate.setDate(startDate.getDate() - 84); // Last 12 weeks
        groupByFormat = '%Y-W%U'; // Year-Week format
        break;
      case 'quarterly':
        startDate = new Date();
        startDate.setMonth(startDate.getMonth() - 24); // Last 8 quarters (2 years)
        groupByFormat = '%Y-Q%q'; // Custom quarterly format, will need post-processing
        break;
      case 'monthly':
      default:
        startDate = new Date();
        startDate.setMonth(startDate.getMonth() - 12); // Last 12 months
        groupByFormat = '%Y-%m'; // Year-Month format
    }
    
    // Get all transcripts for this agent within the time range
    const transcripts = await Transcript.find({
      agentId: new mongoose.Types.ObjectId(agentId),
      createdAt: { $gte: startDate, $lte: endDate }
    }).lean();
    
    // Map of period to performance metrics
    const periodMap = {};
    
    // Process each transcript to build trend data
    transcripts.forEach(transcript => {
      if (!transcript.analysis || !transcript.analysis.scorecard) return;
      
      // Create period identifier based on period type
      let period;
      const date = new Date(transcript.createdAt);
      
      if (periodType === 'weekly') {
        // Get week number
        const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
        const pastDaysOfYear = (date - firstDayOfYear) / 86400000;
        const weekNum = Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
        period = `Week ${weekNum}`;
      } else if (periodType === 'quarterly') {
        // Get quarter
        const quarter = Math.floor(date.getMonth() / 3) + 1;
        period = `Q${quarter} ${date.getFullYear()}`;
      } else {
        // Monthly - default
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                            'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        period = `${monthNames[date.getMonth()]} ${date.getFullYear()}`;
      }
      
      // Initialize period data if it doesn't exist
      if (!periodMap[period]) {
        periodMap[period] = {
          period,
          customerService: 0,
          productKnowledge: 0,
          processEfficiency: 0,
          problemSolving: 0,
          overallScore: 0,
          count: 0
        };
      }
      
      // Update period data with this transcript's scores
      const scorecard = transcript.analysis.scorecard;
      
      if (scorecard.customerService !== undefined) {
        periodMap[period].customerService += scorecard.customerService;
      }
      
      if (scorecard.productKnowledge !== undefined) {
        periodMap[period].productKnowledge += scorecard.productKnowledge;
      }
      
      if (scorecard.processEfficiency !== undefined) {
        periodMap[period].processEfficiency += scorecard.processEfficiency;
      }
      
      if (scorecard.problemSolving !== undefined) {
        periodMap[period].problemSolving += scorecard.problemSolving;
      }
      
      if (scorecard.overallScore !== undefined) {
        periodMap[period].overallScore += scorecard.overallScore;
      }
      
      periodMap[period].count++;
    });
    
    // Convert to array and calculate averages
    let trendsArray = Object.values(periodMap).map(period => {
      if (period.count > 0) {
        return {
          period: period.period,
          customerService: parseFloat((period.customerService / period.count).toFixed(1)),
          productKnowledge: parseFloat((period.productKnowledge / period.count).toFixed(1)),
          processEfficiency: parseFloat((period.processEfficiency / period.count).toFixed(1)),
          problemSolving: parseFloat((period.problemSolving / period.count).toFixed(1)),
          overallScore: parseFloat((period.overallScore / period.count).toFixed(1)),
          callCount: period.count
        };
      }
      return null;
    }).filter(Boolean);
    
    // Sort by date/period
    trendsArray.sort((a, b) => {
      // For quarterly sorting
      if (periodType === 'quarterly') {
        const [aYear, aQuarter] = a.period.split(' ');
        const [bYear, bQuarter] = b.period.split(' ');
        
        if (aYear !== bYear) {
          return aYear.localeCompare(bYear);
        }
        return aQuarter.localeCompare(bQuarter);
      }
      
      // For monthly sorting
      if (periodType === 'monthly') {
        const aMonth = a.period.split(' ')[0];
        const bMonth = b.period.split(' ')[0];
        const aYear = a.period.split(' ')[1];
        const bYear = b.period.split(' ')[1];
        
        const monthOrder = {'Jan': 1, 'Feb': 2, 'Mar': 3, 'Apr': 4, 'May': 5, 'Jun': 6, 
                            'Jul': 7, 'Aug': 8, 'Sep': 9, 'Oct': 10, 'Nov': 11, 'Dec': 12};
        
        if (aYear !== bYear) {
          return aYear - bYear;
        }
        return monthOrder[aMonth] - monthOrder[bMonth];
      }
      
      // For weekly sorting
      return a.period.localeCompare(b.period);
    });
    
    // Return the trend data
    res.json({
      agentId,
      periodType,
      trends: trendsArray
    });
    
  } catch (error) {
    console.error('Error getting agent performance trends:', error);
    res.status(500).json({ message: 'Failed to retrieve performance trends' });
  }
}; 