const mongoose = require('mongoose');
require('dotenv').config();
const aggregationService = require('../services/aggregationService');

// Command line parameter for rebuild
const shouldRebuild = process.argv.includes('--rebuild');

async function main() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    if (shouldRebuild) {
      console.log('Performing complete rebuild of agent performance aggregates...');
      const result = await aggregationService.rebuildAgentPerformanceAggregates();
      console.log('Rebuild complete:', result);
    } else {
      console.log('Normalizing agent performance aggregates...');
      const result = await aggregationService.normalizeAgentPerformanceAggregates();
      console.log('Normalization complete:', result);
    }

    console.log('Done!');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

main(); 