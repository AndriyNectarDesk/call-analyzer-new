# Agent Analytics Module - Database Implementation

## Database Schema

### Agent Model

The Agent model includes the following fields related to analytics:

```javascript
{
  // Basic agent information
  firstName: String,
  lastName: String,
  email: String,
  externalId: String,
  department: String,
  position: String,
  skills: [String],
  status: String,  // 'active', 'inactive', etc.
  organizationId: ObjectId,
  
  // Performance metrics
  performanceMetrics: {
    currentPeriod: {
      periodName: String,      // e.g., 'January 2023', 'Q1 2023'
      periodStart: Date,       // Start date of the current measurement period
      periodEnd: Date,         // End date of the current measurement period
      callsAnalyzed: Number,   // Number of calls included in the analysis
      
      averageScores: {
        customerService: Number,    // 0-100 score
        productKnowledge: Number,   // 0-100 score
        processEfficiency: Number,  // 0-100 score
        problemSolving: Number,     // 0-100 score
        overallScore: Number        // 0-100 score
      },
      
      trends: {
        improving: [String],        // Areas showing improvement
        declining: [String],        // Areas showing decline
        stable: [String]            // Areas remaining stable
      },
      
      topStrengths: [String],       // List of top strengths
      topImprovementAreas: [String] // List of top improvement areas
    },
    
    historicalPeriods: [
      // Array of previous period metrics with same structure as currentPeriod
    ]
  }
}
```

### Call Analysis Model

Each analyzed call is stored with the following structure:

```javascript
{
  transcript: String,              // Full call transcript
  agentId: ObjectId,               // Reference to the agent
  organizationId: ObjectId,        // Reference to the organization
  callDate: Date,                  // When the call occurred
  callDuration: Number,            // Duration in seconds
  
  analysis: {
    callSummary: {
      // Call-specific summary data
    },
    
    agentPerformance: {
      strengths: [String],
      areasForImprovement: [String]
    },
    
    scorecard: {
      customerService: Number,    // 0-100 score
      productKnowledge: Number,   // 0-100 score
      processEfficiency: Number,  // 0-100 score
      problemSolving: Number,     // 0-100 score
      overallScore: Number        // 0-100 score
    }
  },
  
  metadata: {
    // Any additional call metadata
    department: String,
    callType: String,
    // etc.
  }
}
```

## Database Operations

### Agent Performance Metrics Calculation

The system calculates agent performance metrics based on analyzed calls over a specific period. The core operations include:

1. **Aggregation Pipeline:**
   ```javascript
   // Sample aggregation for calculating average scores
   const results = await CallAnalysis.aggregate([
     { $match: { 
         agentId: agentId,
         callDate: { $gte: startDate, $lte: endDate } 
     }},
     { $group: {
         _id: "$agentId",
         avgCustomerService: { $avg: "$analysis.scorecard.customerService" },
         avgProductKnowledge: { $avg: "$analysis.scorecard.productKnowledge" },
         avgProcessEfficiency: { $avg: "$analysis.scorecard.processEfficiency" },
         avgProblemSolving: { $avg: "$analysis.scorecard.problemSolving" },
         avgOverallScore: { $avg: "$analysis.scorecard.overallScore" },
         callCount: { $sum: 1 }
     }}
   ]);
   ```

2. **Trend Analysis:**
   The system compares current period scores with previous period scores to identify trends:
   ```javascript
   // Simplified trend calculation
   const trends = {
     improving: [],
     declining: [],
     stable: []
   };
   
   // Compare each metric with previous period
   for (const metric of metrics) {
     const currentScore = currentPeriod.averageScores[metric];
     const previousScore = previousPeriod.averageScores[metric];
     const difference = currentScore - previousScore;
     
     if (difference >= IMPROVEMENT_THRESHOLD) {
       trends.improving.push(metric);
     } else if (difference <= -DECLINE_THRESHOLD) {
       trends.declining.push(metric);
     } else {
       trends.stable.push(metric);
     }
   }
   ```

3. **Historical Data Management:**
   When updating agent metrics, the system maintains historical records:
   ```javascript
   // When saving new metrics and preserving history
   if (saveHistorical && agent.performanceMetrics.currentPeriod) {
     // Move current period to historical records
     agent.performanceMetrics.historicalPeriods.unshift({
       ...agent.performanceMetrics.currentPeriod
     });
     
     // Limit historical records if needed
     if (agent.performanceMetrics.historicalPeriods.length > MAX_HISTORICAL_PERIODS) {
       agent.performanceMetrics.historicalPeriods = 
         agent.performanceMetrics.historicalPeriods.slice(0, MAX_HISTORICAL_PERIODS);
     }
   }
   
   // Set new current period
   agent.performanceMetrics.currentPeriod = newMetrics;
   await agent.save();
   ```

## Database Queries

### Performance Metrics Retrieval

The agent performance metrics are queried in several ways:

1. **Individual Agent Performance:**
   ```javascript
   const agent = await Agent.findOne({
     _id: agentId,
     organizationId: organizationId
   });
   
   return agent.performanceMetrics;
   ```

2. **Organizational-Level Analytics:**
   ```javascript
   // Get top performing agents
   const topAgents = await Agent.find({
     organizationId: organizationId,
     status: 'active',
     'performanceMetrics.currentPeriod.averageScores.overallScore': { $exists: true }
   })
   .sort({'performanceMetrics.currentPeriod.averageScores.overallScore': -1})
   .limit(limit);
   
   // Get agents requiring coaching
   const agentsNeedingCoaching = await Agent.find({
     organizationId: organizationId,
     status: 'active',
     'performanceMetrics.currentPeriod.averageScores.overallScore': { $lt: COACHING_THRESHOLD }
   });
   ```

3. **Performance Filtering:**
   ```javascript
   // Filter agents by department and performance
   const departmentPerformance = await Agent.find({
     organizationId: organizationId,
     department: department,
     'performanceMetrics.currentPeriod.averageScores.overallScore': { $gte: minScore }
   })
   .select('firstName lastName performanceMetrics')
   .sort({'performanceMetrics.currentPeriod.averageScores.overallScore': -1});
   ```

## Scheduled Database Operations

The system uses scheduled jobs to update agent metrics:

```javascript
// Scheduled job to update all agent metrics
const updateAgentMetricsJob = {
  name: 'updateAgentMetrics',
  schedule: '0 0 * * *', // Daily at midnight
  job: async () => {
    const organizations = await Organization.find({});
    
    for (const organization of organizations) {
      await agentAnalyticsService.updateAllAgentMetrics(
        organization._id,
        {
          startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
          endDate: new Date(),
          saveHistorical: true,
          periodName: `Monthly Update ${new Date().toLocaleDateString()}`
        }
      );
    }
  }
};
```

## Data Migration Considerations

When modifying the analytics schema, consider these migration approaches:

1. **Adding new metrics:**
   ```javascript
   // Add a new metric to all agents
   await Agent.updateMany(
     { 'performanceMetrics.currentPeriod': { $exists: true } },
     { $set: { 'performanceMetrics.currentPeriod.newMetric': defaultValue } }
   );
   ```

2. **Updating calculation methods:**
   ```javascript
   // Re-calculate metrics with new method
   const agents = await Agent.find({
     'performanceMetrics.currentPeriod': { $exists: true }
   });
   
   for (const agent of agents) {
     const newMetrics = await calculateUpdatedMetrics(agent._id);
     agent.performanceMetrics.currentPeriod = {
       ...agent.performanceMetrics.currentPeriod,
       ...newMetrics
     };
     await agent.save();
   }
   ```

## Indexing Strategy

To optimize queries related to agent analytics, use these indexes:

```javascript
// On Agent collection
Agent.index({ organizationId: 1, status: 1 });
Agent.index({ 'performanceMetrics.currentPeriod.averageScores.overallScore': 1 });
Agent.index({ department: 1, 'performanceMetrics.currentPeriod.averageScores.overallScore': 1 });

// On Call Analysis collection
CallAnalysis.index({ agentId: 1, callDate: 1 });
CallAnalysis.index({ organizationId: 1, callDate: 1 });
CallAnalysis.index({ 'analysis.scorecard.overallScore': 1 });
```

## Performance Considerations

For efficient agent analytics queries:

1. Use projection to limit returned fields when querying large agent datasets
2. Implement pagination for organization-wide performance reports
3. Consider using materialized views or pre-aggregated data for frequently accessed metrics
4. Cache frequently accessed performance reports with appropriate invalidation strategies
5. Implement incremental updates rather than recalculating all metrics from scratch 