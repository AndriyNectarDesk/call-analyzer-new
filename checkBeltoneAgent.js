/**
 * Check a single Beltone agent to verify data and metrics
 */

require('dotenv').config();
const { MongoClient, ObjectId } = require('mongodb');

// Connection URI
const MONGODB_URI = 'mongodb+srv://callanalyzer:callanalyzer%40123@callanalyzer.0bi3jhc.mongodb.net/test?retryWrites=true&w=majority&appName=CallAnalyzer';

// Agent with highest transcript count (Cocoa Love)
const AGENT_ID = '680fde180dfc32d279f73740';

async function checkAgentData() {
  let client;
  
  try {
    console.log('Connecting to MongoDB directly...');
    client = new MongoClient(MONGODB_URI);
    
    await client.connect();
    console.log('Connected successfully to MongoDB');
    
    const db = client.db();
    const agentsCollection = db.collection('agents');
    
    // Get the agent with full data
    const agent = await agentsCollection.findOne({ 
      _id: new ObjectId(AGENT_ID)
    });
    
    if (!agent) {
      console.log('Agent not found!');
      return;
    }
    
    console.log('Agent Profile:');
    
    // Display basic info
    const basicInfo = {
      _id: agent._id,
      externalId: agent.externalId,
      name: `${agent.firstName || ''} ${agent.lastName || ''}`.trim(),
      email: agent.email,
      status: agent.status,
      organizationId: agent.organizationId
    };
    
    console.log(JSON.stringify(basicInfo, null, 2));
    
    // Display current period metrics
    console.log('\nCurrent Period Performance Metrics:');
    
    if (agent.performanceMetrics && agent.performanceMetrics.currentPeriod) {
      console.log(JSON.stringify(agent.performanceMetrics.currentPeriod, null, 2));
    } else {
      console.log('No current period metrics found!');
    }
    
    // Display historical data summary
    console.log('\nHistorical Data:');
    
    if (agent.performanceMetrics && agent.performanceMetrics.historical && agent.performanceMetrics.historical.length > 0) {
      console.log(`Found ${agent.performanceMetrics.historical.length} historical entries`);
      
      // Show just first entry for brevity
      console.log('\nMost Recent Historical Entry:');
      console.log(JSON.stringify(agent.performanceMetrics.historical[0], null, 2));
    } else {
      console.log('No historical data found!');
    }
    
  } catch (error) {
    console.error('Error checking agent data:', error);
  } finally {
    if (client) {
      await client.close();
      console.log('Disconnected from MongoDB');
    }
  }
}

// Run the function
checkAgentData(); 