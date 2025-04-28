/**
 * Scheduled job to update agent performance metrics
 * 
 * This job runs on a schedule to update performance metrics for all agents
 * across all organizations.
 */

const mongoose = require('mongoose');
const Agent = require('../models/agent');
const Organization = require('../models/organization');
const agentAnalyticsService = require('../services/agentAnalyticsService');
const cronSchedule = process.env.AGENT_METRICS_CRON || '0 0 * * *'; // Default to midnight daily

/**
 * Main job function to update agent metrics
 */
async function updateAllOrganizationsAgentMetrics() {
  try {
    console.log('Starting scheduled agent metrics update job');
    
    // Find all active organizations
    const organizations = await Organization.find({ active: true });
    console.log(`Processing ${organizations.length} active organizations`);
    
    // Set the date range for metrics (last 30 days by default)
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);
    
    // Track current month name for historical records
    const currentPeriod = endDate.toLocaleString('default', { month: 'long', year: 'numeric' });
    
    // Process each organization
    for (const org of organizations) {
      try {
        console.log(`Updating agent metrics for organization: ${org.name} (${org._id})`);
        
        // Check if it's the first day of the month to save historical data
        const saveHistorical = endDate.getDate() === 1;
        
        const options = {
          startDate,
          endDate,
          saveHistorical,
          periodName: currentPeriod
        };
        
        // Update metrics for all agents in this organization
        const result = await agentAnalyticsService.updateAllAgentMetrics(org._id, options);
        console.log(`Updated ${result.agentsUpdated} agents for organization ${org.name}`);
      } catch (orgError) {
        console.error(`Error updating metrics for organization ${org._id}:`, orgError);
        // Continue with next organization despite the error
      }
    }
    
    console.log('Agent metrics update job completed successfully');
  } catch (error) {
    console.error('Agent metrics update job failed:', error);
  }
}

// Export the job function for use in the main job scheduler
module.exports = {
  schedule: cronSchedule,
  name: 'updateAgentMetrics',
  job: updateAllOrganizationsAgentMetrics
}; 